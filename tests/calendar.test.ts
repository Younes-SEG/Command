import { describe, expect, it } from 'vitest';
import { getCalendarOccurrences } from '../src/lib/calendar';
import { dateKey } from '../src/lib/dates';
import { assessment, task, workspace } from './fixtures';

describe('combined calendar', () => {
  it('uses an exclusive upper boundary while including events overlapping the range', () => {
    const start = new Date(2026, 8, 28);
    const end = new Date(2026, 8, 29);
    const data = workspace({
      tasks: [
        task({ id: 'start', dueDate: start.toISOString() }),
        task({ id: 'end', dueDate: end.toISOString() }),
        task({ id: 'undated' }),
      ],
      assessments: [assessment({ dueDate: new Date(2026, 8, 28, 12).toISOString() })],
      events: [
        {
          id: 'overlap',
          title: 'Overnight visit',
          description: '',
          startAt: new Date(2026, 8, 27, 22).toISOString(),
          endAt: new Date(2026, 8, 28, 8).toISOString(),
          allDay: false,
          location: '',
          courseId: null,
          color: '#6366f1',
        },
        {
          id: 'finished',
          title: 'Finished',
          description: '',
          startAt: new Date(2026, 8, 27, 22).toISOString(),
          endAt: start.toISOString(),
          allDay: false,
          location: '',
          courseId: null,
          color: '#6366f1',
        },
      ],
    });
    const result = getCalendarOccurrences(data, start, end);
    expect(result.map((item) => item.sourceId)).toEqual(['overlap', 'start', 'assessment-1']);
    expect(result.find((item) => item.kind === 'assessments')?.color).toBe('#34d399');
  });

  it('excludes archived course items and completed work unless requested', () => {
    const data = workspace({
      tasks: [
        task({ id: 'done', status: 'COMPLETED', dueDate: '2026-09-28T12:00:00Z' }),
        task({ id: 'archived', courseId: 'course-1', dueDate: '2026-09-28T12:00:00Z' }),
      ],
    });
    data.courses[0].archived = true;
    const start = new Date('2026-09-28T00:00:00Z');
    const end = new Date('2026-09-29T00:00:00Z');
    expect(getCalendarOccurrences(data, start, end)).toEqual([]);
    expect(
      getCalendarOccurrences(data, start, end, { showCompleted: true, includeArchived: true }),
    ).toHaveLength(2);
  });

  it('expands only matching weekdays inside inclusive semester dates at stable local times across DST', () => {
    const data = workspace({
      semesters: [
        {
          id: 'semester-1',
          name: 'Short term',
          startDate: '2026-03-08',
          endDate: '2026-03-15',
          isActive: false,
        },
      ],
      schedules: [
        {
          id: 'class-1',
          courseId: 'course-1',
          title: 'Lecture',
          dayOfWeek: 0,
          startTime: '09:30',
          endTime: '10:45',
          location: 'SITE 101',
        },
      ],
    });
    const result = getCalendarOccurrences(data, new Date(2026, 2, 1), new Date(2026, 2, 23));
    expect(result.map((item) => dateKey(item.start))).toEqual(['2026-03-08', '2026-03-15']);
    expect(
      result.every((item) => item.start.getHours() === 9 && item.start.getMinutes() === 30),
    ).toBe(true);
    expect(result.every((item) => item.end.getHours() === 10 && item.end.getMinutes() === 45)).toBe(
      true,
    );
    expect(new Set(result.map((item) => item.id)).size).toBe(2);
    expect(result.every((item) => item.sourceId === 'class-1')).toBe(true);
  });
});
