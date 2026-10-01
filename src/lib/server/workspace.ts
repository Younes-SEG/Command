import type { Workspace } from '@/lib/types';
import { db } from './db';

/** Read one consistent snapshot; all view-specific calculations happen outside persistence. */
export async function getWorkspace(): Promise<Workspace> {
  const [semesters, courses, assessments, tasks, events, schedules, settings] =
    await db.$transaction(
      [
        db.semester.findMany({ orderBy: { startDate: 'desc' } }),
        db.course.findMany({ orderBy: { code: 'asc' } }),
        db.assessment.findMany({ orderBy: { dueDate: 'asc' } }),
        db.task.findMany({
          include: { subtasks: { orderBy: { position: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.calendarEvent.findMany({ orderBy: { startAt: 'asc' } }),
        db.scheduleEntry.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
        db.settings.findUniqueOrThrow({ where: { id: 'preferences' } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

  return {
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
      timeFormat: settings.timeFormat as '12' | '24',
      weekStartsOn: settings.weekStartsOn as 0 | 1,
      studyBuddy: settings.studyBuddy as Workspace['settings']['studyBuddy'],
    },
  };
}
