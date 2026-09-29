import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { CourseField, Field, localDateTime, NotesField, SelectField, TextField } from './fields';
import type { CalendarEvent, Course, ScheduleEntry } from '@/lib/types';
import { toDate } from '@/lib/dates';

function eventEnd(initial: Partial<CalendarEvent>) {
  const end = toDate(initial.endAt);
  if (!end) return '';
  if (initial.allDay) end.setDate(end.getDate() - 1);
  return localDateTime(end.toISOString());
}

export function EventFields({
  initial,
  courses,
}: {
  initial: Partial<CalendarEvent>;
  courses: Course[];
}) {
  const [allDay, setAllDay] = useState(initial.allDay ?? false);
  const [start, setStart] = useState(localDateTime(initial.startAt));
  const [end, setEnd] = useState(eventEnd(initial));
  return (
    <div className="form-grid">
      <TextField
        name="title"
        label="Event title"
        value={initial.title}
        placeholder="e.g. Study session at the library"
        required
        wide
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          name="allDay"
          type="checkbox"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        All-day event
      </label>
      <Field name="startAt" label={allDay ? 'Start date' : 'Starts'}>
        <Input
          id="editor-startAt"
          name="startAt"
          required
          type={allDay ? 'date' : 'datetime-local'}
          value={allDay ? start.slice(0, 10) : start}
          onChange={(event) =>
            setStart(allDay ? `${event.target.value}T09:00` : event.target.value)
          }
        />
      </Field>
      <Field
        name="endAt"
        label={allDay ? 'Last day' : 'Ends'}
        hint={allDay ? 'Include every day through this date.' : undefined}
      >
        <Input
          id="editor-endAt"
          name="endAt"
          required
          type={allDay ? 'date' : 'datetime-local'}
          value={allDay ? end.slice(0, 10) : end}
          onChange={(event) => setEnd(allDay ? `${event.target.value}T10:00` : event.target.value)}
        />
      </Field>
      <CourseField courses={courses} value={initial.courseId} />
      <Field name="color" label="Event color" hint="Associated events use their course’s color.">
        <Input
          id="editor-color"
          name="color"
          type="color"
          defaultValue={initial.color ?? '#8273d5'}
          className="h-10 w-full cursor-pointer p-1"
        />
      </Field>
      <TextField
        name="location"
        label="Location (optional)"
        value={initial.location}
        maxLength={300}
        wide
      />
      <NotesField name="description" label="Description" value={initial.description} />
    </div>
  );
}

export function ScheduleFields({
  initial,
  courses,
}: {
  initial: Partial<ScheduleEntry>;
  courses: Course[];
}) {
  return (
    <div className="form-grid">
      <TextField
        name="title"
        label="Session name"
        value={initial.title}
        placeholder="e.g. Lecture, tutorial, or lab"
        required
        wide
      />
      <CourseField courses={courses} value={initial.courseId} required />
      <SelectField
        name="dayOfWeek"
        label="Repeats every"
        value={String(initial.dayOfWeek ?? 1)}
        options={[
          { value: '1', label: 'Monday' },
          { value: '2', label: 'Tuesday' },
          { value: '3', label: 'Wednesday' },
          { value: '4', label: 'Thursday' },
          { value: '5', label: 'Friday' },
          { value: '6', label: 'Saturday' },
          { value: '0', label: 'Sunday' },
        ]}
      />
      <TextField
        name="startTime"
        label="Start time"
        type="time"
        value={initial.startTime ?? '09:00'}
        required
      />
      <TextField
        name="endTime"
        label="End time"
        type="time"
        value={initial.endTime ?? '10:00'}
        required
      />
      <TextField
        name="location"
        label="Location (optional)"
        value={initial.location}
        placeholder="e.g. SITE 0102"
        maxLength={300}
        wide
      />
      <p className="muted text-xs leading-relaxed sm:col-span-2">
        This session repeats weekly during the course’s semester. Add one-time exams and deadlines
        as assessments.
      </p>
    </div>
  );
}
