'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/components/workspace-provider';
import type { EditorKind, EditorState } from '@/lib/types';
import { CourseFields, SemesterFields } from './course-fields';
import { AssessmentFields } from './assessment-fields';
import { TaskFields } from './task-fields';
import { EventFields, ScheduleFields } from './calendar-fields';

const labels: Record<EditorKind, string> = {
  courses: 'course',
  semesters: 'semester',
  assessments: 'assessment',
  tasks: 'task',
  events: 'event',
  schedules: 'class session',
};
const descriptions: Record<EditorKind, string> = {
  courses: 'A dedicated space for your course, assessments, and progress.',
  semesters: 'Keep your university life organized, one term at a time.',
  assessments: 'Keep deadlines, course weights, and grades in one place.',
  tasks: 'Turn something on your mind into a clear next step.',
  events: 'Make room in your calendar for what matters.',
  schedules: 'Add a recurring class to your weekly rhythm.',
};

function serialize(kind: EditorKind, form: FormData): Record<string, unknown> {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const optional = (key: string) => text(key) || null;
  const number = (key: string) => Number(text(key));
  const checked = (key: string) => form.get(key) === 'on';
  const datetime = (key: string) => (text(key) ? new Date(text(key)).toISOString() : null);
  switch (kind) {
    case 'courses':
      return {
        code: text('code'),
        name: text('name'),
        semesterId: text('semesterId'),
        instructor: optional('instructor'),
        color: text('color'),
        notes: text('notes'),
        archived: checked('archived'),
      };
    case 'semesters': {
      if (text('endDate') < text('startDate'))
        throw new Error('The semester end date must be on or after its start date.');
      return {
        name: text('name'),
        startDate: text('startDate'),
        endDate: text('endDate'),
        isActive: checked('isActive'),
      };
    }
    case 'assessments': {
      const score = text('score') ? number('score') : null;
      if (score !== null && score > number('maxScore'))
        throw new Error('Score received cannot exceed the maximum score.');
      return {
        name: text('name'),
        courseId: text('courseId'),
        type: text('type'),
        dueDate: datetime('dueDate'),
        weight: number('weight'),
        maxScore: number('maxScore'),
        score,
        status: score !== null ? 'GRADED' : text('status'),
        notes: text('notes'),
      };
    }
    case 'tasks':
      return {
        title: text('title'),
        description: text('description'),
        dueDate: datetime('dueDate'),
        priority: text('priority'),
        status: text('status'),
        estimatedMinutes: text('estimatedMinutes') ? number('estimatedMinutes') : null,
        courseId: optional('courseId'),
        assessmentId: optional('assessmentId'),
        subtasks: JSON.parse(text('subtasks') || '[]'),
      };
    case 'events': {
      const allDay = checked('allDay');
      const start = new Date(allDay ? `${text('startAt')}T00:00:00` : text('startAt'));
      const end = new Date(allDay ? `${text('endAt')}T00:00:00` : text('endAt'));
      if (allDay) end.setDate(end.getDate() + 1);
      if (end <= start) throw new Error('The event must end after it starts.');
      return {
        title: text('title'),
        description: text('description'),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay,
        courseId: optional('courseId'),
        location: text('location'),
        color: text('color'),
      };
    }
    case 'schedules': {
      if (text('endTime') <= text('startTime'))
        throw new Error('The class must end after it starts, on the same day.');
      return {
        title: text('title'),
        courseId: text('courseId'),
        dayOfWeek: number('dayOfWeek'),
        startTime: text('startTime'),
        endTime: text('endTime'),
        location: text('location'),
      };
    }
  }
}

function EntityDialog({ editor }: { editor: EditorState }) {
  const { data, save, remove, closeEditor } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const record = editor.id ? data[editor.kind].find((item) => item.id === editor.id) : undefined;
  const initial = { ...editor.defaults, ...record };
  const label = labels[editor.kind];
  const missing = Boolean(editor.id && !record);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await save(editor.kind, serialize(editor.kind, form), editor.id);
      closeEditor();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntity() {
    if (!editor.id) return;
    setBusy(true);
    setError('');
    try {
      await remove(editor.kind, editor.id);
      closeEditor();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) closeEditor();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {confirmDelete ? `Delete ${label}?` : `${editor.id ? 'Edit' : 'New'} ${label}`}
          </DialogTitle>
          <DialogDescription>
            {confirmDelete
              ? 'This action is permanent and cannot be undone.'
              : descriptions[editor.kind]}
          </DialogDescription>
        </DialogHeader>
        {missing ? (
          <div className="py-6">
            <p>This {label} no longer exists.</p>
            <Button variant="outline" onClick={closeEditor} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className={confirmDelete ? 'hidden' : 'form-stack'}>
              <fieldset disabled={busy} className="min-w-0">
                {editor.kind === 'courses' && (
                  <CourseFields initial={initial} semesters={data.semesters} />
                )}
                {editor.kind === 'semesters' && <SemesterFields initial={initial} />}
                {editor.kind === 'assessments' && (
                  <AssessmentFields initial={initial} courses={data.courses} />
                )}
                {editor.kind === 'tasks' && (
                  <TaskFields
                    initial={initial}
                    courses={data.courses}
                    assessments={data.assessments}
                    timeFormat={data.settings.timeFormat}
                  />
                )}
                {editor.kind === 'events' && (
                  <EventFields initial={initial} courses={data.courses} />
                )}
                {editor.kind === 'schedules' && (
                  <ScheduleFields initial={initial} courses={data.courses} />
                )}
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-[var(--destructive)]"
                >
                  {error}
                </p>
              )}
              <DialogFooter className="mt-2 flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row">
                {editor.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--destructive)] sm:mr-auto"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setConfirmDelete(true);
                    }}
                  >
                    <Trash2 size={15} />
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" disabled={busy} onClick={closeEditor}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy || (editor.kind === 'courses' && !data.semesters.length)}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {busy ? 'Saving…' : editor.id ? 'Save changes' : `Create ${label}`}
                </Button>
              </DialogFooter>
            </form>
            {confirmDelete && (
              <div className="form-stack">
                <p className="text-sm leading-relaxed">
                  {editor.kind === 'courses'
                    ? 'This deletes the course, its assessments, and recurring classes. Linked tasks and personal events are kept without this course.'
                    : editor.kind === 'semesters'
                      ? 'A semester can only be deleted after its courses have been moved or removed.'
                      : `This ${label} will be removed from your workspace.`}
                </p>
                {error && (
                  <p role="alert" className="text-sm text-[var(--destructive)]">
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    autoFocus
                    onClick={() => {
                      setError('');
                      setConfirmDelete(false);
                    }}
                  >
                    Keep {label}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
                    onClick={deleteEntity}
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}Delete {label}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditorHost() {
  const { editor } = useWorkspace();
  return editor ? (
    <EntityDialog
      key={`${editor.kind}:${editor.id ?? 'new'}:${JSON.stringify(editor.defaults ?? {})}`}
      editor={editor}
    />
  ) : null;
}
