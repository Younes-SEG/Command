import { Prisma } from '@/generated/prisma/client';
import { db } from './db';
import { ApiError } from './errors';
import { requireWorkspaceId } from './auth';
import {
  assessmentSchema,
  courseSchema,
  eventSchema,
  scheduleSchema,
  semesterSchema,
  settingsSchema,
  taskSchema,
} from './validation';

type Transaction = Prisma.TransactionClient;

function exists<T>(record: T | null, name = 'Entry'): T {
  if (!record) throw new ApiError(404, `${name} no longer exists. Refresh and try again.`);
  return record;
}

async function requireCourse(tx: Transaction, id: string | null, workspaceId: string) {
  if (id)
    exists(
      await tx.course.findUnique({
        where: { id, semester: { workspaceId } },
        select: { id: true },
      }),
      'Course',
    );
}

/** Serializability prevents concurrent edits from over-allocating assessment weights. */
export async function transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15_000 });
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < 2
      ))
        throw error;
    }
  }
}

export async function saveEntity(entity: string, body: Record<string, unknown>, id?: string) {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    switch (entity) {
      case 'semesters': {
        const current = id
          ? exists(await tx.semester.findUnique({ where: { id, workspaceId } }))
          : {};
        const data = semesterSchema.parse({ ...current, ...body });
        if (data.isActive)
          await tx.semester.updateMany({
            where: { workspaceId, isActive: true, ...(id ? { id: { not: id } } : {}) },
            data: { isActive: false },
          });
        return id
          ? tx.semester.update({ where: { id, workspaceId }, data })
          : tx.semester.create({ data: { ...data, workspaceId } });
      }
      case 'courses': {
        const current = id
          ? exists(await tx.course.findUnique({ where: { id, semester: { workspaceId } } }))
          : {};
        const data = courseSchema.parse({ ...current, ...body });
        exists(
          await tx.semester.findUnique({ where: { id: data.semesterId, workspaceId } }),
          'Semester',
        );
        return id ? tx.course.update({ where: { id }, data }) : tx.course.create({ data });
      }
      case 'assessments': {
        const current = id
          ? exists(
              await tx.assessment.findUnique({
                where: { id, course: { semester: { workspaceId } } },
              }),
            )
          : null;
        const data = assessmentSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        const weights = await tx.assessment.aggregate({
          where: { courseId: data.courseId, ...(id ? { id: { not: id } } : {}) },
          _sum: { weight: true },
        });
        const allocated = weights._sum.weight ?? 0;
        if (allocated + data.weight > 100 + 0.000001) {
          throw new ApiError(
            400,
            `Assessment weights cannot exceed 100%. There is ${Math.max(0, 100 - allocated).toFixed(2)}% available in this course.`,
          );
        }
        if (current && current.courseId !== data.courseId)
          await tx.task.updateMany({
            where: { assessmentId: id, workspaceId },
            data: { courseId: data.courseId },
          });
        return id ? tx.assessment.update({ where: { id }, data }) : tx.assessment.create({ data });
      }
      case 'tasks': {
        const current = id
          ? exists(
              await tx.task.findUnique({
                where: { id, workspaceId },
                include: { subtasks: { orderBy: { position: 'asc' } } },
              }),
            )
          : null;
        const { subtasks, ...data } = taskSchema.parse({ ...current, ...body });
        if (data.assessmentId) {
          const assessment = exists(
            await tx.assessment.findUnique({
              where: { id: data.assessmentId, course: { semester: { workspaceId } } },
              select: { courseId: true },
            }),
            'Assessment',
          );
          if (data.courseId && data.courseId !== assessment.courseId)
            throw new ApiError(400, 'The assessment must belong to the selected course.');
          data.courseId = assessment.courseId;
        }
        await requireCourse(tx, data.courseId, workspaceId);
        const completedAt =
          data.status === 'COMPLETED' ? (current?.completedAt ?? new Date()) : null;
        const existingIds = new Set(current?.subtasks.map((s) => s.id) ?? []);
        const usedIds = new Set<string>();
        const children = subtasks.map((subtask, position) => {
          const preservedId =
            subtask.id && existingIds.has(subtask.id) && !usedIds.has(subtask.id)
              ? subtask.id
              : undefined;
          if (preservedId) usedIds.add(preservedId);
          return {
            ...(preservedId ? { id: preservedId } : {}),
            title: subtask.title,
            completed: subtask.completed,
            position,
          };
        });
        return id
          ? tx.task.update({
              where: { id },
              data: {
                ...data,
                completedAt,
                ...(body.subtasks !== undefined
                  ? { subtasks: { deleteMany: {}, create: children } }
                  : {}),
              },
              include: { subtasks: { orderBy: { position: 'asc' } } },
            })
          : tx.task.create({
              data: { ...data, workspaceId, completedAt, subtasks: { create: children } },
              include: { subtasks: { orderBy: { position: 'asc' } } },
            });
      }
      case 'events': {
        const current = id
          ? exists(await tx.calendarEvent.findUnique({ where: { id, workspaceId } }))
          : {};
        const data = eventSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        return id
          ? tx.calendarEvent.update({ where: { id }, data })
          : tx.calendarEvent.create({ data: { ...data, workspaceId } });
      }
      case 'schedules': {
        const current = id
          ? exists(
              await tx.scheduleEntry.findUnique({
                where: { id, course: { semester: { workspaceId } } },
              }),
            )
          : {};
        const data = scheduleSchema.parse({ ...current, ...body });
        await requireCourse(tx, data.courseId, workspaceId);
        return id
          ? tx.scheduleEntry.update({ where: { id }, data })
          : tx.scheduleEntry.create({ data });
      }
      case 'settings': {
        if (id !== 'preferences') throw new ApiError(404, 'Settings were not found.');
        const current = await tx.settings.findUnique({ where: { workspaceId } });
        const data = settingsSchema.parse({ ...current, ...body });
        const saved = await tx.settings.upsert({
          where: { workspaceId },
          create: {
            ...data,
            workspaceId,
            id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
          },
          update: data,
        });
        return { ...saved, id: 'preferences' };
      }
      default:
        throw new ApiError(404, 'This type of entry does not exist.');
    }
  });
}

export async function deleteEntity(entity: string, id: string) {
  const workspaceId = await requireWorkspaceId();
  return transaction(async (tx) => {
    switch (entity) {
      case 'semesters': {
        exists(await tx.semester.findUnique({ where: { id, workspaceId } }));
        if (await tx.course.count({ where: { semesterId: id, semester: { workspaceId } } }))
          throw new ApiError(
            409,
            'Move or delete this semester’s courses before deleting the semester.',
          );
        await tx.semester.delete({ where: { id, workspaceId } });
        break;
      }
      case 'courses':
        await tx.course.delete({ where: { id, semester: { workspaceId } } });
        break;
      case 'assessments':
        await tx.assessment.delete({ where: { id, course: { semester: { workspaceId } } } });
        break;
      case 'tasks':
        await tx.task.delete({ where: { id, workspaceId } });
        break;
      case 'events':
        await tx.calendarEvent.delete({ where: { id, workspaceId } });
        break;
      case 'schedules':
        await tx.scheduleEntry.delete({ where: { id, course: { semester: { workspaceId } } } });
        break;
      default:
        throw new ApiError(404, 'This type of entry cannot be deleted.');
    }
    return {};
  });
}
