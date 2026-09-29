import { addDays, isOverdue, isSameDay, startOfDay, toDate } from './dates';
import type { Priority, Task, TaskStatus } from './types';

export type TaskView = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
export type TaskSort = 'due' | 'priority' | 'created' | 'title';
export interface TaskFilters {
  view?: TaskView;
  courseId?: string | null;
  priority?: Priority | 'all';
  status?: TaskStatus | 'all';
  search?: string;
  dueFrom?: string | Date;
  dueTo?: string | Date;
  showCompleted?: boolean;
}

export const priorityRank: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };

export function filterTasks(
  tasks: readonly Task[],
  filters: TaskFilters = {},
  now = new Date(),
): Task[] {
  const { view = 'all', showCompleted = false, search = '' } = filters;
  const query = search.trim().toLocaleLowerCase();
  const from = toDate(filters.dueFrom);
  const to = toDate(filters.dueTo);
  // A date-only upper bound includes that whole local calendar day.
  const toExclusive =
    typeof filters.dueTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.dueTo) && to
      ? addDays(to, 1)
      : null;

  return tasks.filter((task) => {
    const completed = task.status === 'COMPLETED';
    const due = toDate(task.dueDate);
    if (
      view === 'completed'
        ? !completed
        : completed && !showCompleted && filters.status !== 'COMPLETED'
    )
      return false;
    if (view === 'today' && !isSameDay(due, now)) return false;
    if (view === 'upcoming' && (!due || due < addDays(startOfDay(now), 1))) return false;
    if (view === 'overdue' && !isOverdue(due, task.status, now)) return false;
    if (
      filters.courseId !== undefined &&
      filters.courseId !== '' &&
      filters.courseId !== 'all' &&
      task.courseId !== filters.courseId
    )
      return false;
    if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority)
      return false;
    if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false;
    if (query && !`${task.title} ${task.description}`.toLocaleLowerCase().includes(query))
      return false;
    if (from && (!due || due < from)) return false;
    if (toExclusive && (!due || due >= toExclusive)) return false;
    if (to && !toExclusive && (!due || due > to)) return false;
    return true;
  });
}

export function sortTasks(
  tasks: readonly Task[],
  sort: TaskSort = 'due',
  direction: 'asc' | 'desc' = 'asc',
): Task[] {
  const factor = direction === 'desc' ? -1 : 1;
  return [...tasks].sort((left, right) => {
    let compared: number;
    switch (sort) {
      case 'priority':
        compared = priorityRank[right.priority] - priorityRank[left.priority];
        break;
      case 'created':
        compared =
          (toDate(right.createdAt)?.getTime() ?? 0) - (toDate(left.createdAt)?.getTime() ?? 0);
        break;
      case 'title':
        compared = left.title.localeCompare(right.title);
        break;
      default: {
        const leftDate = toDate(left.dueDate);
        const rightDate = toDate(right.dueDate);
        // Undated tasks remain last in both directions.
        if (!leftDate && rightDate) return 1;
        if (leftDate && !rightDate) return -1;
        compared = (leftDate?.getTime() ?? 0) - (rightDate?.getTime() ?? 0);
      }
    }
    return (
      factor * compared || left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
  });
}
