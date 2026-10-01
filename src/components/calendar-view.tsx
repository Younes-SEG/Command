'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/workspace-provider';
import { getCalendarOccurrences, type CalendarOccurrence } from '@/lib/calendar';
import {
  addDays,
  addMonths,
  dateKey,
  formatDate,
  formatTime,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';
import type { Course } from '@/lib/types';

type CalendarMode = 'month' | 'week';
type OccurrenceKind = CalendarOccurrence['kind'];
const kindLabels: Record<OccurrenceKind, string> = {
  schedules: 'Class',
  assessments: 'Assessment',
  tasks: 'Task',
  events: 'Event',
};
const kindIcons = {
  schedules: BookOpen,
  assessments: FileText,
  tasks: CheckSquare2,
  events: CalendarDays,
};

function itemsForDay(items: CalendarOccurrence[], day: Date) {
  const start = startOfDay(day);
  const end = addDays(start, 1);
  return items
    .filter((item) =>
      item.end > item.start
        ? item.start < end && item.end > start
        : item.start >= start && item.start < end,
    )
    .sort(
      (left, right) =>
        Number(right.allDay) - Number(left.allDay) || left.start.getTime() - right.start.getTime(),
    );
}

function occurrenceTime(
  item: CalendarOccurrence,
  day: Date,
  timeFormat: '12' | '24',
  includeEnd = false,
) {
  if (item.allDay) return 'All day';
  if (item.start < startOfDay(day))
    return isSameDay(item.end, day) ? `Until ${formatTime(item.end, timeFormat)}` : 'Continues';
  const start = formatTime(item.start, timeFormat);
  return includeEnd && item.end > item.start && isSameDay(item.start, item.end)
    ? `${start} – ${formatTime(item.end, timeFormat)}`
    : start;
}

export function CalendarView() {
  const { data, openEditor, now } = useWorkspace();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(now));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(now));
  const [courseId, setCourseId] = useState('all');
  const [showCompleted, setShowCompleted] = useState(data.settings.showCompleted);
  const courses = data.courses.filter((course) => !course.archived);
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const monthStart = startOfMonth(anchor);
  const rangeStart = startOfWeek(
    mode === 'month' ? monthStart : anchor,
    data.settings.weekStartsOn,
  );
  const monthEnd = addMonths(monthStart, 1);
  const lastMonthDay = addDays(monthEnd, -1);
  const rangeEnd =
    mode === 'week'
      ? addDays(rangeStart, 7)
      : addDays(startOfWeek(lastMonthDay, data.settings.weekStartsOn), 7);
  const days: Date[] = [];
  for (let day = rangeStart; day < rangeEnd; day = addDays(day, 1)) days.push(day);
  const occurrences = getCalendarOccurrences(data, rangeStart, rangeEnd, { showCompleted }).filter(
    (item) =>
      courseId === 'all' ||
      (courseId === 'personal' ? item.courseId === null : item.courseId === courseId),
  );
  const selectedItems = itemsForDay(occurrences, selectedDay);
  const monthOccurrences = occurrences.filter(
    (item) =>
      item.start < monthEnd &&
      (item.end > item.start ? item.end > monthStart : item.start >= monthStart),
  );
  const count = mode === 'month' ? monthOccurrences.length : occurrences.length;

  function navigate(direction: -1 | 1) {
    const next =
      mode === 'month' ? addMonths(monthStart, direction) : addDays(anchor, direction * 7);
    setAnchor(next);
    setSelectedDay(next);
  }

  function selectMode(next: CalendarMode) {
    setMode(next);
    setAnchor(selectedDay);
  }

  function addEvent(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10);
    openEditor('events', undefined, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      ...(courseMap.has(courseId) ? { courseId } : {}),
    });
  }

  function addDeadline(kind: 'tasks' | 'assessments') {
    const due = new Date(selectedDay);
    due.setHours(23, 59, 0, 0);
    openEditor(kind, undefined, {
      dueDate: due.toISOString(),
      ...(courseMap.has(courseId) ? { courseId } : {}),
    });
  }

  const openOccurrence = (item: CalendarOccurrence) => openEditor(item.kind, item.sourceId);
  const weekLast = addDays(rangeEnd, -1);
  const title =
    mode === 'month'
      ? formatDate(anchor, { month: 'long', year: 'numeric' })
      : `${formatDate(rangeStart, { month: 'short', day: 'numeric', ...(rangeStart.getFullYear() !== weekLast.getFullYear() ? { year: 'numeric' as const } : {}) })} – ${formatDate(weekLast, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="eyebrow mb-2">MAKE ROOM FOR WHAT MATTERS</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your calendar</h1>
          <p className="muted mt-2 text-sm">Classes, deadlines, and a little life in between.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings#calendar-connections">Connect calendar</Link>
          </Button>
          <Button onClick={() => addEvent(selectedDay)}>
            <Plus size={16} />
            Add event
          </Button>
        </div>
      </div>

      <section className="card overflow-hidden" aria-label="Calendar">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Previous ${mode}`}
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Next ${mode}`}
                onClick={() => navigate(1)}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight" aria-live="polite">
                {title}
              </h2>
              <p className="muted mt-0.5 text-xs">
                {count} {count === 1 ? 'item' : 'items'} this {mode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-1"
              onClick={() => {
                setAnchor(startOfDay(now));
                setSelectedDay(startOfDay(now));
              }}
            >
              Today
            </Button>
          </div>
          <div
            className="inline-flex gap-1 rounded-lg bg-[var(--muted)] p-1"
            role="group"
            aria-label="Calendar view"
          >
            {(['month', 'week'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => selectMode(value)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${mode === value ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <label htmlFor="calendar-course" className="muted text-xs font-medium">
              Show
            </label>
            <select
              id="calendar-course"
              className="input h-8 max-w-56 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="all">Everything</option>
              <option value="personal">Personal only</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code}
                </option>
              ))}
            </select>
          </div>
          <label className="muted flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
              className="size-3.5 accent-[var(--primary)]"
            />
            Show completed
          </label>
        </div>

        <div className="overflow-x-auto">
          {mode === 'month' ? (
            <MonthGrid
              days={days}
              anchor={anchor}
              now={now}
              selectedDay={selectedDay}
              items={occurrences}
              timeFormat={data.settings.timeFormat}
              onSelectDay={setSelectedDay}
              onAddEvent={addEvent}
              onOpen={openOccurrence}
            />
          ) : (
            <WeekGrid
              days={days}
              now={now}
              items={occurrences}
              courses={courseMap}
              timeFormat={data.settings.timeFormat}
              onAddEvent={addEvent}
              onOpen={openOccurrence}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="muted flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
            {(Object.keys(kindLabels) as OccurrenceKind[]).map((kind) => {
              const Icon = kindIcons[kind];
              return (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <Icon size={12} />
                  {kindLabels[kind]}
                </span>
              );
            })}
          </div>
          <p className="muted text-[11px]">Times shown in your local time zone</p>
        </div>
      </section>

      {mode === 'month' && (
        <section className="card p-5 sm:p-6" aria-label="Selected day agenda">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">DAY AT A GLANCE</p>
              <h2 className="section-title">
                {isSameDay(selectedDay, now)
                  ? 'Today'
                  : formatDate(selectedDay, { weekday: 'long' })}
                <span className="muted ml-2 text-sm font-normal">
                  {formatDate(selectedDay, { month: 'long', day: 'numeric' })}
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => addDeadline('tasks')}>
                <Plus size={14} />
                Task
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addDeadline('assessments')}>
                <Plus size={14} />
                Assessment
              </Button>
              <Button variant="outline" size="sm" onClick={() => addEvent(selectedDay)}>
                <Plus size={14} />
                Event
              </Button>
            </div>
          </div>
          {selectedItems.length ? (
            <div className="divide-y divide-[var(--border)]">
              {selectedItems.map((item) => (
                <AgendaItem
                  key={item.id}
                  item={item}
                  day={selectedDay}
                  course={item.courseId ? courseMap.get(item.courseId) : undefined}
                  timeFormat={data.settings.timeFormat}
                  onOpen={() => openOccurrence(item)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state rounded-xl bg-[var(--muted)]/40 px-4 py-8">
              <CalendarDays size={25} className="muted mx-auto mb-3" />
              <h3 className="text-sm font-medium">A little room in your day</h3>
              <p className="muted mt-1.5 text-sm">
                {courseId !== 'all'
                  ? 'No items match this calendar filter.'
                  : 'Nothing scheduled. Make space for a break, or plan something ahead.'}
              </p>
            </div>
          )}
        </section>
      )}
      <p className="muted text-xs sm:hidden">Swipe the calendar sideways to see all seven days.</p>
    </div>
  );
}

interface GridProps {
  days: Date[];
  now: Date;
  items: CalendarOccurrence[];
  timeFormat: '12' | '24';
  onAddEvent: (day: Date) => void;
  onOpen: (item: CalendarOccurrence) => void;
}

function MonthGrid({
  days,
  anchor,
  now,
  selectedDay,
  items,
  timeFormat,
  onSelectDay,
  onAddEvent,
  onOpen,
}: GridProps & { anchor: Date; selectedDay: Date; onSelectDay: (day: Date) => void }) {
  return (
    <div className="min-w-[720px]">
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {days.slice(0, 7).map((day) => (
          <div
            key={dateKey(day)}
            className="muted px-3 py-3 text-center text-[11px] font-medium uppercase tracking-wider"
          >
            {formatDate(day, { weekday: 'short' })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayItems = itemsForDay(items, day);
          const currentMonth = day.getMonth() === anchor.getMonth();
          const today = isSameDay(day, now);
          const selected = isSameDay(day, selectedDay);
          return (
            <div
              key={dateKey(day)}
              className={`group min-h-[150px] min-w-0 border-[var(--border)] p-2 ${index % 7 !== 6 ? 'border-r' : ''} ${index < days.length - 7 ? 'border-b' : ''} ${!currentMonth ? 'bg-[var(--muted)]/30' : ''} ${selected ? 'bg-[var(--primary)]/5' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-current={today ? 'date' : undefined}
                  aria-pressed={selected}
                  aria-label={`Show agenda for ${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}`}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${today ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : selected ? 'bg-[var(--muted)] text-[var(--primary)] ring-1 ring-[var(--primary)]/25' : currentMonth ? 'hover:bg-[var(--muted)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}
                >
                  {day.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => onAddEvent(day)}
                  aria-label={`Add event on ${formatDate(day, { month: 'long', day: 'numeric' })}`}
                  className="muted flex size-6 items-center justify-center rounded-md opacity-45 transition-opacity hover:bg-[var(--muted)] hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <MonthItem
                    key={item.id}
                    item={item}
                    day={day}
                    timeFormat={timeFormat}
                    onOpen={() => onOpen(item)}
                  />
                ))}
                {dayItems.length > 3 && (
                  <button
                    className="muted w-full rounded-md px-1.5 py-1 text-left text-[10px] font-medium hover:bg-[var(--muted)]"
                    onClick={() => onSelectDay(day)}
                  >
                    +{dayItems.length - 3} more · view day
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthItem({
  item,
  day,
  timeFormat,
  onOpen,
}: {
  item: CalendarOccurrence;
  day: Date;
  timeFormat: '12' | '24';
  onOpen: () => void;
}) {
  const Icon = kindIcons[item.kind];
  const time = occurrenceTime(item, day, timeFormat);
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${kindLabels[item.kind]}: ${item.title} · ${time}`}
      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md border-l-2 px-1.5 py-1.5 text-left text-[10px] hover:ring-1 hover:ring-[var(--control-border)] ${item.completed ? 'text-[var(--muted-foreground)]' : ''}`}
      style={{ borderLeftColor: item.color, backgroundColor: `${item.color}12` }}
    >
      <Icon size={10} className="shrink-0" style={{ color: item.color }} />
      <span
        className={`min-w-0 flex-1 truncate font-medium ${item.completed ? 'line-through' : ''}`}
      >
        {item.title}
      </span>
      {!item.allDay && (
        <span className="hidden shrink-0 text-[9px] text-[var(--muted-foreground)] xl:inline">
          {time}
        </span>
      )}
    </button>
  );
}

function WeekGrid({
  days,
  now,
  items,
  courses,
  timeFormat,
  onAddEvent,
  onOpen,
}: GridProps & { courses: Map<string, Course> }) {
  return (
    <div className="grid min-w-[980px] grid-cols-7">
      {days.map((day, index) => {
        const dayItems = itemsForDay(items, day);
        const today = isSameDay(day, now);
        return (
          <section
            key={dateKey(day)}
            aria-label={formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}
            className={`min-w-0 ${index !== 6 ? 'border-r border-[var(--border)]' : ''} ${today ? 'bg-[var(--primary)]/5' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-4">
              <div>
                <p className="muted text-[10px] font-medium uppercase tracking-wider">
                  {formatDate(day, { weekday: 'short' })}
                </p>
                <p
                  className={`mt-1 flex size-8 items-center justify-center rounded-full text-xl font-semibold ${today ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''}`}
                >
                  {day.getDate()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddEvent(day)}
                className="muted rounded-md p-1 hover:bg-[var(--muted)]"
                aria-label={`Add event on ${formatDate(day, { month: 'long', day: 'numeric' })}`}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="min-h-[420px] space-y-2 p-2.5">
              {dayItems.length ? (
                dayItems.map((item) => {
                  const Icon = kindIcons[item.kind];
                  const course = item.courseId ? courses.get(item.courseId) : undefined;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpen(item)}
                      className={`w-full rounded-lg border border-[var(--border)] border-l-[3px] p-2.5 text-left transition-shadow hover:shadow-md ${item.completed ? 'text-[var(--muted-foreground)]' : ''}`}
                      style={{ borderLeftColor: item.color, backgroundColor: `${item.color}0c` }}
                    >
                      <span className="mb-2 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                        <Icon size={11} />
                        {kindLabels[item.kind]}
                      </span>
                      <span
                        className={`block break-words text-xs font-medium leading-5 ${item.completed ? 'line-through' : ''}`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-2 block text-[10px] leading-4 text-[var(--muted-foreground)]">
                        {occurrenceTime(item, day, timeFormat, true)}
                      </span>
                      {course && (
                        <span
                          className="mt-1.5 block truncate text-[10px] font-medium"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {course.code}
                        </span>
                      )}
                      {item.location && (
                        <span className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                          <MapPin size={10} className="shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="muted pt-12 text-center text-[11px]">A little breathing room</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AgendaItem({
  item,
  day,
  course,
  timeFormat,
  onOpen,
}: {
  item: CalendarOccurrence;
  day: Date;
  course?: Course;
  timeFormat: '12' | '24';
  onOpen: () => void;
}) {
  const Icon = kindIcons[item.kind];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 py-4 text-left first:pt-0 last:pb-0 sm:gap-5 ${item.completed ? 'text-[var(--muted-foreground)]' : ''}`}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ color: item.color, backgroundColor: `${item.color}18` }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${item.completed ? 'line-through' : ''}`}>
          {item.title}
        </p>
        <p className="muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{course?.code ?? 'Personal'}</span>
          <span aria-hidden="true">·</span>
          <span>
            {kindLabels[item.kind]}
            {item.completed ? ' · Completed' : ''}
          </span>
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {item.location}
            </span>
          )}
        </p>
      </div>
      <span className="muted flex max-w-32 shrink-0 items-center gap-1.5 text-right text-xs sm:max-w-none">
        <Clock3 size={13} className="hidden shrink-0 sm:block" />
        {occurrenceTime(item, day, timeFormat, true)}
      </span>
      <ChevronRight size={15} className="muted hidden shrink-0 sm:block" />
    </button>
  );
}
