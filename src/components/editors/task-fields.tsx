import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CourseField,
  Field,
  localDateTime,
  NotesField,
  optionsFor,
  SelectField,
  TextField,
} from './fields';
import type { Assessment, Course, Subtask, Task } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/dates';

export function TaskFields({
  initial,
  courses,
  assessments,
  timeFormat = '12',
}: {
  initial: Partial<Task>;
  courses: Course[];
  assessments: Assessment[];
  timeFormat?: '12' | '24';
}) {
  const [courseId, setCourseId] = useState(
    initial.courseId ??
      assessments.find((assessment) => assessment.id === initial.assessmentId)?.courseId ??
      '',
  );
  const [assessmentId, setAssessmentId] = useState(initial.assessmentId ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial.subtasks ?? []);
  function updateSubtask(id: string, change: Partial<Subtask>) {
    setSubtasks((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }
  return (
    <div className="form-grid">
      <TextField
        name="title"
        label="Task title"
        value={initial.title}
        placeholder="What needs to get done?"
        required
        wide
      />
      <CourseField
        courses={courses}
        value={courseId}
        onChange={(value) => {
          setCourseId(value);
          setAssessmentId('');
        }}
      />
      <SelectField
        name="assessmentId"
        label="Assessment (optional)"
        value={assessmentId}
        onChange={setAssessmentId}
        required={false}
        options={[
          { value: '', label: courseId ? 'No assessment' : 'Select a course first' },
          ...assessments
            .filter((assessment) => assessment.courseId === courseId)
            .map((assessment) => ({ value: assessment.id, label: assessment.name })),
        ]}
      />
      <TextField
        name="dueDate"
        label="Due date & time (optional)"
        type="datetime-local"
        value={localDateTime(initial.dueDate)}
      />
      <TextField
        name="estimatedMinutes"
        label="Estimated duration (minutes)"
        type="number"
        value={initial.estimatedMinutes}
        min={1}
        max={10080}
        step={1}
        placeholder="e.g. 45"
      />
      <SelectField
        name="priority"
        label="Priority"
        value={initial.priority ?? 'MEDIUM'}
        options={optionsFor(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])}
      />
      <SelectField
        name="status"
        label="Status"
        value={initial.status ?? 'NOT_STARTED'}
        options={optionsFor(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])}
      />
      <NotesField
        name="description"
        label="Description"
        value={initial.description}
        placeholder="Add context, links, or a little extra detail…"
      />
      <Field name="subtasks" label="Subtasks" wide>
        <input
          type="hidden"
          name="subtasks"
          value={JSON.stringify(subtasks.filter((item) => item.title.trim()))}
        />
        <div className="space-y-2" id="editor-subtasks" role="group" aria-label="Subtasks">
          {subtasks.map((subtask, index) => (
            <div className="flex items-center gap-2" key={subtask.id}>
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={(event) => updateSubtask(subtask.id, { completed: event.target.checked })}
                aria-label={`Complete subtask ${index + 1}`}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              <Input
                value={subtask.title}
                onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
                aria-label={`Subtask ${index + 1}`}
                placeholder="A smaller step"
                maxLength={200}
                className={subtask.completed ? 'line-through opacity-60' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove subtask ${index + 1}`}
                onClick={() =>
                  setSubtasks((items) => items.filter((item) => item.id !== subtask.id))
                }
              >
                <X size={15} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={subtasks.length >= 100}
            onClick={() =>
              setSubtasks((items) => [
                ...items,
                { id: crypto.randomUUID(), title: '', completed: false },
              ])
            }
          >
            <Plus size={15} />
            Add a subtask
          </Button>
        </div>
      </Field>
      {initial.createdAt && (
        <div className="muted space-y-1 text-xs sm:col-span-2">
          <p>
            Created{' '}
            <time dateTime={initial.createdAt}>
              {formatDate(initial.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              at {formatTime(initial.createdAt, timeFormat)}
            </time>
          </p>
          {initial.completedAt && (
            <p>
              Completed{' '}
              <time dateTime={initial.completedAt}>
                {formatDate(initial.completedAt, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at {formatTime(initial.completedAt, timeFormat)}
              </time>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
