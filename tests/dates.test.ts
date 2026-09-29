import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateKey,
  dueLabel,
  isOverdue,
  isSameDay,
  startOfDay,
  startOfWeek,
  toDate,
  toDateTimeLocal,
} from '../src/lib/dates';

describe('local calendar dates', () => {
  it('parses date-only values locally and rejects impossible dates', () => {
    expect(toDate('2026-09-28')?.getHours()).toBe(0);
    expect(dateKey(toDate('2026-09-28'))).toBe('2026-09-28');
    expect(toDate('2026-02-30')).toBeNull();
    expect(toDate('invalid')).toBeNull();
    expect(isSameDay(null, null)).toBe(false);
  });

  it('advances calendar days across DST without shifting wall time or mutating input', () => {
    const start = new Date(2026, 2, 7, 12, 30);
    const next = addDays(start, 1);
    expect(dateKey(next)).toBe('2026-03-08');
    expect(next.getHours()).toBe(12);
    expect(next.getMinutes()).toBe(30);
    expect(dateKey(start)).toBe('2026-03-07');
    expect(next.getTime() - start.getTime()).toBe(
      86_400_000 + (next.getTimezoneOffset() - start.getTimezoneOffset()) * 60_000,
    );
    expect(dateKey(addDays(new Date(2026, 10, 1, 12), 1))).toBe('2026-11-02');
  });

  it('honors week start preferences and clamps month navigation at month-end', () => {
    const sunday = new Date(2026, 8, 27, 18);
    expect(dateKey(startOfWeek(sunday, 1))).toBe('2026-09-21');
    expect(dateKey(startOfWeek(sunday, 0))).toBe('2026-09-27');
    expect(dateKey(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(startOfDay(sunday).getHours()).toBe(0);
  });

  it('labels by local day and formats datetime inputs without UTC date shifts', () => {
    const now = new Date(2026, 8, 28, 0, 5);
    expect(dueLabel(new Date(2026, 8, 28, 23, 59), now)).toBe('Today');
    expect(dueLabel(new Date(2026, 8, 29), now)).toBe('Tomorrow');
    expect(dueLabel(new Date(2026, 8, 27, 23, 59), now)).toBe('Yesterday');
    expect(dueLabel(null, now)).toBe('No due date');
    expect(toDateTimeLocal(now)).toBe('2026-09-28T00:05');
  });
});

describe('overdue detection', () => {
  const now = new Date('2026-09-28T16:00:00.000Z');

  it('compares exact instants and does not flag missing or invalid due dates', () => {
    expect(isOverdue('2026-09-28T15:59:59.999Z', 'IN_PROGRESS', now)).toBe(true);
    expect(isOverdue(now, 'NOT_STARTED', now)).toBe(false);
    expect(isOverdue('2026-09-28T16:00:00.001Z', 'NOT_STARTED', now)).toBe(false);
    expect(isOverdue(null, 'NOT_STARTED', now)).toBe(false);
    expect(isOverdue('bad date', 'NOT_STARTED', now)).toBe(false);
  });

  it('excludes completed tasks and submitted or graded assessments', () => {
    for (const status of ['COMPLETED', 'SUBMITTED', 'GRADED']) {
      expect(isOverdue('2026-01-01T12:00:00Z', status, now)).toBe(false);
    }
  });
});
