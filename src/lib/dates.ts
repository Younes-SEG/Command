export type DateValue = Date | string | number | null | undefined;

/** Date-only values describe a local calendar day, never UTC midnight. */
export function toDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }
  const date = new Date(value instanceof Date ? value.getTime() : value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateKey(value: DateValue): string {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar arithmetic preserves local wall time across daylight-saving changes. */
export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  return addDays(startOfDay(date), -((date.getDay() - weekStartsOn + 7) % 7));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function isSameDay(left: DateValue, right: DateValue): boolean {
  const leftKey = dateKey(left);
  return leftKey !== '' && leftKey === dateKey(right);
}

export function isOverdue(dueDate: DateValue, status?: string, now = new Date()): boolean {
  if (status && ['COMPLETED', 'SUBMITTED', 'GRADED'].includes(status)) return false;
  const due = toDate(dueDate);
  return due !== null && due.getTime() < now.getTime();
}

export function dueLabel(value: DateValue, now = new Date()): string {
  const date = toDate(value);
  if (!date) return 'No due date';
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  if (isSameDay(date, addDays(now, -1))) return 'Yesterday';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(date);
}

export function formatDate(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('en', options).format(date) : '—';
}

export function formatTime(value: DateValue, timeFormat: '12' | '24' = '12'): string {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        hourCycle: timeFormat === '24' ? 'h23' : 'h12',
      }).format(date)
    : '—';
}

export function toDateTimeLocal(value: DateValue): string {
  const date = toDate(value);
  return date
    ? `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '';
}
