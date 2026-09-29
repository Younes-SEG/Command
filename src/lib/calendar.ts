import { addDays, dateKey, startOfDay, toDate } from './dates';
import type { Workspace } from './types';

export interface CalendarOccurrence {
  id: string;
  sourceId: string;
  kind: 'tasks' | 'assessments' | 'events' | 'schedules';
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  courseId: string | null;
  color: string;
  completed: boolean;
  location: string;
}

export interface CalendarOptions {
  showCompleted?: boolean;
  includeArchived?: boolean;
}

function withTime(day: Date, time: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Range is start-inclusive/end-exclusive; semester end dates include the entire day. */
export function getCalendarOccurrences(
  workspace: Workspace,
  rangeStart: Date,
  rangeEnd: Date,
  options: CalendarOptions = {},
): CalendarOccurrence[] {
  if (
    !Number.isFinite(rangeStart.getTime()) ||
    !Number.isFinite(rangeEnd.getTime()) ||
    rangeEnd <= rangeStart
  )
    return [];
  const showCompleted = options.showCompleted ?? workspace.settings.showCompleted;
  const courses = new Map(workspace.courses.map((course) => [course.id, course]));
  const semesters = new Map(workspace.semesters.map((semester) => [semester.id, semester]));
  const occurrences: CalendarOccurrence[] = [];
  const visible = (courseId: string | null) =>
    !courseId || options.includeArchived || !courses.get(courseId)?.archived;
  const color = (courseId: string | null, fallback = '#8b5cf6') =>
    (courseId ? courses.get(courseId)?.color : undefined) ?? fallback;

  const push = (item: CalendarOccurrence) => {
    if (!visible(item.courseId) || (!showCompleted && item.completed)) return;
    const overlaps =
      item.end > item.start
        ? item.start < rangeEnd && item.end > rangeStart
        : item.start >= rangeStart && item.start < rangeEnd;
    if (overlaps) occurrences.push(item);
  };

  for (const task of workspace.tasks) {
    const start = toDate(task.dueDate);
    if (!start) continue;
    push({
      id: `task:${task.id}`,
      sourceId: task.id,
      kind: 'tasks',
      title: task.title,
      start,
      end: start,
      allDay: false,
      courseId: task.courseId,
      color: color(task.courseId),
      completed: task.status === 'COMPLETED',
      location: '',
    });
  }
  for (const assessment of workspace.assessments) {
    const start = toDate(assessment.dueDate);
    if (!start) continue;
    push({
      id: `assessment:${assessment.id}`,
      sourceId: assessment.id,
      kind: 'assessments',
      title: assessment.name,
      start,
      end: start,
      allDay: false,
      courseId: assessment.courseId,
      color: color(assessment.courseId),
      completed: ['GRADED', 'SUBMITTED'].includes(assessment.status),
      location: '',
    });
  }
  for (const event of workspace.events) {
    const start = toDate(event.startAt);
    const end = toDate(event.endAt);
    if (!start || !end || end < start) continue;
    push({
      id: `event:${event.id}`,
      sourceId: event.id,
      kind: 'events',
      title: event.title,
      start,
      end,
      allDay: event.allDay,
      courseId: event.courseId,
      color: color(event.courseId, event.color),
      completed: false,
      location: event.location,
    });
  }

  for (const schedule of workspace.schedules) {
    const course = courses.get(schedule.courseId);
    const semester = course && semesters.get(course.semesterId);
    if (!course || !semester || !visible(course.id)) continue;
    const semesterStart = toDate(semester.startDate);
    const semesterEnd = toDate(semester.endDate);
    if (!semesterStart || !semesterEnd) continue;
    const first = startOfDay(rangeStart > semesterStart ? rangeStart : semesterStart);
    const last = new Date(
      Math.min(rangeEnd.getTime(), addDays(startOfDay(semesterEnd), 1).getTime()),
    );
    // Advance calendar days, not 24-hour durations, to preserve class times across DST.
    for (let day = first; day < last; day = addDays(day, 1)) {
      if (day.getDay() !== schedule.dayOfWeek) continue;
      const start = withTime(day, schedule.startTime);
      const end = withTime(day, schedule.endTime);
      if (!start || !end || end <= start) continue;
      push({
        id: `schedule:${schedule.id}:${dateKey(day)}`,
        sourceId: schedule.id,
        kind: 'schedules',
        title: schedule.title || course.code,
        start,
        end,
        allDay: false,
        courseId: course.id,
        color: course.color,
        completed: false,
        location: schedule.location,
      });
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.start.getTime() - right.start.getTime() ||
      Number(right.allDay) - Number(left.allDay) ||
      left.title.localeCompare(right.title),
  );
}
