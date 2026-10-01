import { describe, expect, it } from 'vitest';
import {
  assessmentSchema,
  eventSchema,
  scheduleSchema,
  semesterSchema,
  taskSchema,
} from './validation';

describe('assessment input integrity', () => {
  const assessment = { courseId: 'course-1', name: 'Midterm', weight: 30, maxScore: 40 };
  it('requires an explicit graded status for a score, including zero', () => {
    expect(assessmentSchema.safeParse({ ...assessment, score: 0 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...assessment, status: 'GRADED' }).success).toBe(false);
    expect(assessmentSchema.parse({ ...assessment, status: 'GRADED', score: 0 }).score).toBe(0);
  });
  it('rejects invalid maxima and scores outside the possible range', () => {
    expect(assessmentSchema.safeParse({ ...assessment, maxScore: 0 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...assessment, status: 'GRADED', score: 41 }).success).toBe(
      false,
    );
    expect(assessmentSchema.safeParse({ ...assessment, weight: 101 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...assessment, weight: NaN }).success).toBe(false);
  });
});

describe('date and schedule boundaries', () => {
  it('rejects calendar overflow and reversed semester dates', () => {
    expect(
      semesterSchema.safeParse({ name: 'Winter', startDate: '2027-02-29', endDate: '2027-04-30' })
        .success,
    ).toBe(false);
    expect(
      semesterSchema.safeParse({ name: 'Winter', startDate: '2027-04-30', endDate: '2027-01-01' })
        .success,
    ).toBe(false);
    expect(
      semesterSchema
        .parse({ name: 'Leap year', startDate: '2028-02-29', endDate: '2028-04-30' })
        .startDate.toISOString(),
    ).toBe('2028-02-29T00:00:00.000Z');
  });
  it('requires a timezone for timestamps and preserves the instant', () => {
    expect(taskSchema.safeParse({ title: 'Study', dueDate: '2026-09-28T10:00:00' }).success).toBe(
      false,
    );
    expect(
      taskSchema
        .parse({ title: 'Study', dueDate: '2026-09-28T10:00:00-04:00' })
        .dueDate?.toISOString(),
    ).toBe('2026-09-28T14:00:00.000Z');
  });
  it('requires a positive event duration, including all-day events', () => {
    const event = {
      title: 'Reading week',
      startAt: '2026-10-01T04:00:00Z',
      endAt: '2026-10-01T04:00:00Z',
      allDay: true,
    };
    expect(eventSchema.safeParse(event).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, allDay: false }).success).toBe(true);
    expect(
      eventSchema.safeParse({ ...event, allDay: false, endAt: '2026-09-30T04:00:00Z' }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...event, endAt: '2026-10-02T04:00:00Z' }).success).toBe(true);
  });
  it('rejects invalid weekdays and overnight class blocks', () => {
    const schedule = {
      courseId: 'course-1',
      title: 'Lecture',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:20',
    };
    expect(scheduleSchema.safeParse(schedule).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...schedule, dayOfWeek: 7 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...schedule, startTime: '24:00' }).success).toBe(false);
    expect(
      scheduleSchema.safeParse({ ...schedule, startTime: '23:00', endTime: '01:00' }).success,
    ).toBe(false);
  });
});
