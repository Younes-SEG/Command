import type { Workspace } from '@/lib/types';
import { db } from './db';
import { requireWorkspaceId } from './auth';
import { isHosted } from './hosting';

/** Read one consistent snapshot; all view-specific calculations happen outside persistence. */
export async function getWorkspace(): Promise<Workspace> {
  const workspaceId = await requireWorkspaceId();
  // Each authenticated identity starts empty; never seed demo data or copy another workspace.
  await db.settings.upsert({
    where: { workspaceId },
    create: {
      id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
      workspaceId,
    },
    update: {},
  });
  const [semesters, courses, assessments, tasks, events, schedules, settings] =
    await db.$transaction(
      [
        db.semester.findMany({ where: { workspaceId }, orderBy: { startDate: 'desc' } }),
        db.course.findMany({ where: { semester: { workspaceId } }, orderBy: { code: 'asc' } }),
        db.assessment.findMany({
          where: { course: { semester: { workspaceId } } },
          orderBy: { dueDate: 'asc' },
        }),
        db.task.findMany({
          where: { workspaceId },
          include: { subtasks: { orderBy: { position: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.calendarEvent.findMany({ where: { workspaceId }, orderBy: { startAt: 'asc' } }),
        db.scheduleEntry.findMany({
          where: { course: { semester: { workspaceId } } },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        db.settings.findUniqueOrThrow({ where: { workspaceId } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

  return {
    hosted: isHosted(),
    semesters: semesters.map((s) => ({
      ...s,
      startDate: s.startDate.toISOString().slice(0, 10),
      endDate: s.endDate.toISOString().slice(0, 10),
    })),
    courses,
    assessments: assessments.map((a) => ({ ...a, dueDate: a.dueDate?.toISOString() ?? null })),
    tasks: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
      subtasks: t.subtasks.map(({ id, title, completed }) => ({ id, title, completed })),
    })),
    events: events.map((e) => ({
      ...e,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
    })),
    schedules,
    settings: {
      ...settings,
      id: 'preferences',
      timeFormat: settings.timeFormat as '12' | '24',
      weekStartsOn: settings.weekStartsOn as 0 | 1,
      studyBuddy: settings.studyBuddy as Workspace['settings']['studyBuddy'],
    },
  };
}
