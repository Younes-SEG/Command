import { describe, expect, it } from 'vitest';
import { filterTasks, sortTasks } from '../src/lib/tasks';
import { task } from './fixtures';

const now = new Date(2026, 8, 28, 12);
const tasks = [
  task({
    id: 'overdue',
    title: 'Read calculus',
    courseId: 'math',
    priority: 'HIGH',
    dueDate: new Date(2026, 8, 28, 11).toISOString(),
  }),
  task({
    id: 'today',
    title: 'Write report',
    courseId: 'software',
    priority: 'URGENT',
    dueDate: new Date(2026, 8, 28, 23, 59).toISOString(),
  }),
  task({
    id: 'tomorrow',
    title: 'Review algebra',
    courseId: 'math',
    dueDate: new Date(2026, 8, 29, 10).toISOString(),
  }),
  task({ id: 'undated', title: 'Buy notebook' }),
  task({
    id: 'completed',
    title: 'Done',
    dueDate: new Date(2026, 8, 28, 10).toISOString(),
    status: 'COMPLETED',
  }),
];

describe('task views and filters', () => {
  it('keeps today, upcoming, overdue, and completed semantics consistent', () => {
    expect(filterTasks(tasks, { view: 'today' }, now).map((item) => item.id)).toEqual([
      'overdue',
      'today',
    ]);
    expect(filterTasks(tasks, { view: 'upcoming' }, now).map((item) => item.id)).toEqual([
      'tomorrow',
    ]);
    expect(filterTasks(tasks, { view: 'overdue' }, now).map((item) => item.id)).toEqual([
      'overdue',
    ]);
    expect(filterTasks(tasks, { view: 'completed' }, now).map((item) => item.id)).toEqual([
      'completed',
    ]);
    expect(filterTasks(tasks, { view: 'all', showCompleted: true }, now)).toHaveLength(5);
    expect(filterTasks(tasks, { status: 'COMPLETED' }, now).map((item) => item.id)).toEqual([
      'completed',
    ]);
  });

  it('combines course, priority, search, and date boundaries, including all of the final day', () => {
    expect(
      filterTasks(
        tasks,
        {
          courseId: 'math',
          priority: 'HIGH',
          search: ' CALCULUS ',
          dueFrom: '2026-09-28',
          dueTo: '2026-09-28',
        },
        now,
      ).map((item) => item.id),
    ).toEqual(['overdue']);
    expect(filterTasks(tasks, { dueTo: '2026-09-28' }, now).map((item) => item.id)).toEqual([
      'overdue',
      'today',
    ]);
    expect(filterTasks(tasks, { dueFrom: '2026-09-29' }, now).map((item) => item.id)).toEqual([
      'tomorrow',
    ]);
    expect(filterTasks(tasks, { courseId: null }, now).map((item) => item.id)).toEqual(['undated']);
  });
});

describe('task sorting', () => {
  it('sorts due dates without mutation and leaves undated work last in both directions', () => {
    const input = [...tasks];
    expect(sortTasks(input, 'due').map((item) => item.id)).toEqual([
      'completed',
      'overdue',
      'today',
      'tomorrow',
      'undated',
    ]);
    expect(sortTasks(input, 'due', 'desc').map((item) => item.id)).toEqual([
      'tomorrow',
      'today',
      'overdue',
      'completed',
      'undated',
    ]);
    expect(input).toEqual(tasks);
    expect(sortTasks(input, 'priority')[0].id).toBe('today');
  });
});
