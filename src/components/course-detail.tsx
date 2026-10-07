'use client';

import Link from 'next/link';
import { useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/components/workspace-provider';
import { calculateGrades, calculateTarget } from '@/lib/grades';
import type { Assessment, Course, ScheduleEntry } from '@/lib/types';
import { statusLabel } from '@/components/editors/fields';

const tabs = ['Overview', 'Assessments', 'Grades', 'Schedule', 'Notes'] as const;
type CourseTab = (typeof tabs)[number];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const percent = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1).replace(/\.0$/, '')}%`;
const timeLabel = (value: string, hour12: boolean) => {
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  });
};

export function CourseDetail({ id }: { id: string }) {
  const { data, openEditor, now } = useWorkspace();
  const [tab, setTab] = useState<CourseTab>('Overview');
  const course = data.courses.find((item) => item.id === id);
  if (!course)
    return (
      <div className="empty-state card py-20">
        <BookOpen className="mx-auto mb-4" size={32} />
        <h1 className="text-xl font-semibold">Course not found</h1>
        <p className="muted mt-2">It may have been removed from your workspace.</p>
        <Link
          href="/courses"
          className="mt-5 inline-flex text-sm font-medium text-[var(--primary)]"
        >
          Back to courses <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  const assessments = data.assessments
    .filter((item) => item.courseId === id)
    .sort(
      (a, b) =>
        (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
        (b.dueDate ? new Date(b.dueDate).getTime() : Infinity),
    );
  const schedules = data.schedules
    .filter((item) => item.courseId === id)
    .sort(
      (a, b) =>
        ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7) || a.startTime.localeCompare(b.startTime),
    );
  const semester = data.semesters.find((item) => item.id === course.semesterId);
  const grades = calculateGrades(assessments);
  const tasks = data.tasks.filter((item) => item.courseId === id && item.status !== 'COMPLETED');
  const upcoming = assessments
    .filter((item) => item.dueDate && new Date(item.dueDate) >= now && item.status !== 'GRADED')
    .slice(0, 3);

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next]);
    document.getElementById(`course-tab-${tabs[next]}`)?.focus();
  }

  return (
    <div className="space-y-7">
      <Link
        href="/courses"
        className="muted inline-flex items-center gap-2 text-sm transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} />
        All courses
      </Link>
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${course.color}18`, color: 'var(--foreground)' }}
          >
            <BookOpen size={25} />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="eyebrow" style={{ color: 'var(--foreground)' }}>
                {course.code}
              </span>
              <span className="badge">{semester?.name ?? 'No semester'}</span>
              {course.archived && <span className="badge">Archived</span>}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{course.name}</h1>
            <p className="muted mt-2 text-sm">{course.instructor || 'Your course workspace'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/syllabus?course=${encodeURIComponent(id)}`}>Import syllabus</Link>
          </Button>
          <Button variant="outline" onClick={() => openEditor('courses', id)}>
            <Pencil size={14} />
            Edit course
          </Button>
        </div>
      </div>

      <div className="tabs overflow-x-auto" role="tablist" aria-label="Course sections">
        {tabs.map((item, index) => (
          <button
            key={item}
            id={`course-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`course-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            className={`tab whitespace-nowrap ${tab === item ? 'active' : ''}`}
            onClick={() => setTab(item)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            {item}
            {item === 'Assessments' && (
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                {assessments.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`course-panel-${tab}`}
        aria-labelledby={`course-tab-${tab}`}
        tabIndex={0}
        className="space-y-6 focus-visible:outline-none"
      >
        {tab === 'Overview' && (
          <>
            <GradeSummary assessments={assessments} />
            <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <section className="card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="section-title">Coming up next</h2>
                  <Button variant="ghost" size="sm" onClick={() => setTab('Assessments')}>
                    View all
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
                {upcoming.length ? (
                  <div className="divide-y divide-[var(--border)]">
                    {upcoming.map((assessment) => (
                      <button
                        key={assessment.id}
                        onClick={() => openEditor('assessments', assessment.id)}
                        className="flex w-full items-center gap-4 py-4 text-left first:pt-0 last:pb-0"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)]">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{assessment.name}</p>
                          <p className="muted mt-1 text-xs">
                            {new Date(assessment.dueDate!).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            · {statusLabel(assessment.type)}
                          </p>
                        </div>
                        <span className="badge">{assessment.weight}%</span>
                        <ArrowUpRight className="muted" size={15} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon="calendar"
                    title="A little breathing room"
                    description="No upcoming assessments scheduled for this course."
                    action="Add assessment"
                    onAction={() => openEditor('assessments', undefined, { courseId: id })}
                  />
                )}
              </section>
              <section className="card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="section-title">Your weekly rhythm</h2>
                  <Button variant="ghost" size="sm" onClick={() => setTab('Schedule')}>
                    Manage
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
                {schedules.length ? (
                  <div className="space-y-4">
                    {schedules.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => openEditor('schedules', entry.id)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <div
                          className="mt-1 h-9 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: course.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {entry.title}
                            <span className="muted ml-2 text-xs">{dayNames[entry.dayOfWeek]}</span>
                          </p>
                          <p className="muted mt-1 text-xs">
                            {timeLabel(entry.startTime, data.settings.timeFormat === '12')} –{' '}
                            {timeLabel(entry.endTime, data.settings.timeFormat === '12')}
                            {entry.location ? ` · ${entry.location}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon="calendar"
                    title="Build your weekly rhythm"
                    description="Add lectures, tutorials, and recurring labs."
                    action="Add class session"
                    onAction={() => openEditor('schedules', undefined, { courseId: id })}
                  />
                )}
              </section>
            </div>
            <section className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">On your to-do list</h2>
                  <p className="muted mt-1 text-sm">
                    {tasks.length} open {tasks.length === 1 ? 'task' : 'tasks'} for {course.code}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditor('tasks', undefined, { courseId: id })}
                >
                  <Plus size={14} />
                  Add task
                </Button>
              </div>
              {tasks.length ? (
                <div className="divide-y divide-[var(--border)]">
                  {tasks.slice(0, 5).map((task) => (
                    <button
                      key={task.id}
                      className="flex w-full items-center gap-3 py-3 text-left"
                      onClick={() => openEditor('tasks', task.id)}
                    >
                      <span className="size-4 shrink-0 rounded border border-[var(--border)]" />
                      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                      <span className="badge">{statusLabel(task.priority)}</span>
                      <ArrowUpRight size={15} className="muted" />
                    </button>
                  ))}
                  {tasks.length > 5 && (
                    <Link
                      href="/tasks"
                      className="inline-block pt-4 text-sm font-medium text-[var(--primary)]"
                    >
                      View all tasks →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="muted py-5 text-center text-sm">
                  You’re all caught up. Add a task when you’re ready.
                </p>
              )}
            </section>
            {grades.warnings.length > 0 && <GradeWarnings warnings={grades.warnings} />}
          </>
        )}
        {tab === 'Assessments' && (
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <div>
                <h2 className="section-title">Assessments</h2>
                <p className="muted mt-1 text-sm">Every deadline and deliverable, in one place.</p>
              </div>
              <Button onClick={() => openEditor('assessments', undefined, { courseId: id })}>
                <Plus size={15} />
                Add assessment
              </Button>
            </div>
            {assessments.length ? (
              <AssessmentTable assessments={assessments} />
            ) : (
              <Empty
                icon="file"
                title="Your course starts here"
                description="Add assignments, labs, quizzes, and exams to plan the semester."
                action="Add your first assessment"
                onAction={() => openEditor('assessments', undefined, { courseId: id })}
              />
            )}
          </section>
        )}
        {tab === 'Grades' && <GradesPanel assessments={assessments} courseId={id} />}
        {tab === 'Schedule' && (
          <SchedulePanel entries={schedules} course={course} semesterName={semester?.name} />
        )}
        {tab === 'Notes' && <NotesPanel key={`${course.id}:${course.notes}`} course={course} />}
      </div>
    </div>
  );
}

function GradeSummary({ assessments }: { assessments: Assessment[] }) {
  const grades = calculateGrades(assessments);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card p-5 sm:p-6">
        <p className="muted text-sm">Current grade</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">
          {percent(grades.currentGrade)}
          <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
            {grades.currentGrade === null ? 'No grades yet' : 'on graded work'}
          </span>
        </p>
        <p className="muted mt-3 text-xs">Weighted average of graded assessments only.</p>
      </div>
      <div className="card p-5 sm:p-6">
        <p className="muted text-sm">Course graded</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">
          {percent(grades.completedWeight)}
        </p>
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"
          role="progressbar"
          aria-label="Course weight graded"
          aria-valuenow={Math.min(100, grades.completedWeight)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${Math.min(100, grades.completedWeight)}%` }}
          />
        </div>
      </div>
      <div className="card p-5 sm:p-6">
        <p className="muted text-sm">Earned toward final grade</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">
          {grades.earnedPoints.toFixed(1).replace(/\.0$/, '')}
          <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
            / 100 points
          </span>
        </p>
        <p className="muted mt-3 text-xs">
          {percent(grades.remainingWeight)} of the course remains ungraded.
        </p>
      </div>
    </div>
  );
}

function AssessmentTable({
  assessments,
  grades = false,
}: {
  assessments: Assessment[];
  grades?: boolean;
}) {
  const { openEditor, data, now } = useWorkspace();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Assessment</th>
            <th scope="col">Due date</th>
            <th scope="col">Weight</th>
            <th scope="col">Score</th>
            {grades && <th scope="col">Final grade contribution</th>}
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((assessment) => {
            const overdue = Boolean(
              assessment.dueDate &&
              new Date(assessment.dueDate) < now &&
              ['NOT_STARTED', 'IN_PROGRESS'].includes(assessment.status),
            );
            return (
              <tr key={assessment.id}>
                <td>
                  <button
                    className="text-left font-medium hover:text-[var(--primary)]"
                    onClick={() => openEditor('assessments', assessment.id)}
                  >
                    {assessment.name}
                  </button>
                  <p className="muted mt-1 text-xs">{statusLabel(assessment.type)}</p>
                </td>
                <td className={overdue ? 'text-[var(--destructive)]' : ''}>
                  {assessment.dueDate ? (
                    <>
                      <span className="whitespace-nowrap">
                        {new Date(assessment.dueDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <p className="mt-1 whitespace-nowrap text-xs opacity-70">
                        {overdue ? 'Overdue · ' : ''}
                        {new Date(assessment.dueDate).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: data.settings.timeFormat === '12',
                        })}
                      </p>
                    </>
                  ) : (
                    <span className="muted">Unscheduled</span>
                  )}
                </td>
                <td>{assessment.weight}%</td>
                <td>
                  {assessment.score === null ? (
                    <span className="muted">—</span>
                  ) : (
                    <>
                      <span className="whitespace-nowrap">
                        {assessment.score} / {assessment.maxScore}
                      </span>
                      <p className="muted mt-1 text-xs">
                        {percent((assessment.score / assessment.maxScore) * 100)}
                      </p>
                    </>
                  )}
                </td>
                {grades && (
                  <td>
                    {assessment.score !== null && assessment.status === 'GRADED' ? (
                      `${((assessment.score / assessment.maxScore) * assessment.weight).toFixed(2)} pts`
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                )}
                <td>
                  <span className="badge whitespace-nowrap">{statusLabel(assessment.status)}</span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditor('assessments', assessment.id)}
                    aria-label={`${grades && assessment.score === null ? 'Enter grade for' : 'Edit'} ${assessment.name}`}
                  >
                    {grades && assessment.score === null ? 'Enter grade' : <Pencil size={14} />}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GradeWarnings({ warnings }: { warnings: string[] }) {
  return warnings.length ? (
    <div
      className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-relaxed"
      role="status"
    >
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  ) : null;
}

function GradesPanel({ assessments, courseId }: { assessments: Assessment[]; courseId: string }) {
  const { openEditor } = useWorkspace();
  const [target, setTarget] = useState('80');
  const targetResult = target.trim() ? calculateTarget(assessments, Number(target)) : null;
  const result = targetResult && {
    ...targetResult,
    requiredAverage:
      targetResult.requiredAverage === null
        ? null
        : Math.ceil((targetResult.requiredAverage - 1e-8) * 10) / 10,
  };
  const summary = calculateGrades(assessments);
  return (
    <>
      <GradeSummary assessments={assessments} />
      <GradeWarnings warnings={summary.warnings} />
      <section className="card grid gap-6 p-5 sm:p-6 md:grid-cols-2 md:gap-10">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={20} className="text-[var(--primary)]" />
            <h2 className="section-title">Plan your finish</h2>
          </div>
          <p className="muted max-w-md text-sm leading-relaxed">
            Choose your target final grade to see the weighted average you need on the remaining
            course work.
          </p>
          <div className="mt-5 max-w-56">
            <Label htmlFor="target-grade">Target final grade (%)</Label>
            <Input
              id="target-grade"
              className="mt-2"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
        </div>
        <div
          className="flex flex-col justify-center rounded-2xl bg-[var(--muted)] p-5"
          aria-live="polite"
        >
          {!result ? (
            <p className="muted text-sm">Enter a target grade to calculate your next step.</p>
          ) : (
            <>
              <p className="muted text-sm">
                {result.status === 'secured'
                  ? 'You’ve already earned enough points'
                  : result.status === 'invalid'
                    ? 'Check your target and assessment weights'
                    : `Average needed on the remaining ${percent(result.remainingWeight)}`}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {result.status === 'secured'
                  ? 'Target secured'
                  : result.status === 'invalid'
                    ? 'Unable to calculate'
                    : result.requiredAverage === null
                      ? 'Out of reach'
                      : percent(result.requiredAverage)}
              </p>
              <p className="muted mt-3 text-sm leading-relaxed">
                {result.status === 'impossible'
                  ? 'This target is not achievable with the remaining weight, even with full marks.'
                  : result.status === 'secured'
                    ? 'You can reach this target even with zero additional points.'
                    : result.status === 'invalid'
                      ? 'Use a target between 0 and 100%, and keep course weights at or below 100%.'
                      : 'This is a required average, not a prediction of your final grade.'}
              </p>
              <p className="muted mt-3 text-xs leading-relaxed">{result.assumption}</p>
            </>
          )}
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div>
            <h2 className="section-title">Your gradebook</h2>
            <p className="muted mt-1 text-sm">
              {percent(summary.configuredWeight)} of course weight configured.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditor('assessments', undefined, { courseId })}
          >
            <Plus size={14} />
            Add assessment
          </Button>
        </div>
        {assessments.length ? (
          <AssessmentTable assessments={assessments} grades />
        ) : (
          <Empty
            icon="file"
            title="Every bit of progress counts"
            description="Add an assessment, then enter its score to start your gradebook."
            action="Add assessment"
            onAction={() => openEditor('assessments', undefined, { courseId })}
          />
        )}
      </section>
    </>
  );
}

function SchedulePanel({
  entries,
  course,
  semesterName,
}: {
  entries: ScheduleEntry[];
  course: Course;
  semesterName?: string;
}) {
  const { openEditor, data } = useWorkspace();
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Weekly schedule</h2>
          <p className="muted mt-1 text-sm">
            Recurring sessions{semesterName ? ` during ${semesterName}` : ''}.
          </p>
        </div>
        <Button onClick={() => openEditor('schedules', undefined, { courseId: course.id })}>
          <Plus size={15} />
          Add class session
        </Button>
      </div>
      {entries.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openEditor('schedules', entry.id)}
              className="flex gap-4 rounded-xl border border-[var(--border)] p-5 text-left transition-colors hover:bg-[var(--muted)]"
            >
              <div
                className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl"
                style={{ backgroundColor: `${course.color}18`, color: 'var(--foreground)' }}
              >
                <span className="text-xs font-medium uppercase">
                  {dayNames[entry.dayOfWeek].slice(0, 3)}
                </span>
                <CalendarDays size={19} className="mt-1" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{entry.title}</p>
                <p className="muted mt-2 flex items-center gap-2 text-sm">
                  <Clock3 size={13} />
                  {timeLabel(entry.startTime, data.settings.timeFormat === '12')} –{' '}
                  {timeLabel(entry.endTime, data.settings.timeFormat === '12')}
                </p>
                {entry.location && (
                  <p className="muted mt-2 flex items-center gap-2 text-sm">
                    <MapPin size={13} />
                    {entry.location}
                  </p>
                )}
              </div>
              <Pencil size={14} className="muted shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon="calendar"
          title="Give your week some structure"
          description="Add recurring lectures, labs, and tutorials. They’ll appear in your calendar automatically."
          action="Add a class session"
          onAction={() => openEditor('schedules', undefined, { courseId: course.id })}
        />
      )}
    </section>
  );
}

function NotesPanel({ course }: { course: Course }) {
  const { save } = useWorkspace();
  const [notes, setNotes] = useState(course.notes);
  const [savedNotes, setSavedNotes] = useState(course.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function saveNotes() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await save('courses', { notes }, course.id);
      setSavedNotes(notes);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Your notes could not be saved. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">A little space to think</h2>
          <p className="muted mt-1 text-sm">
            Course links, office hours, ideas, and things to remember.
          </p>
        </div>
        <Button onClick={saveNotes} disabled={busy || notes === savedNotes}>
          {busy ? 'Saving…' : 'Save notes'}
        </Button>
      </div>
      <Label htmlFor="course-notes" className="sr-only">
        Course notes
      </Label>
      <Textarea
        id="course-notes"
        value={notes}
        disabled={busy}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
        rows={15}
        maxLength={20000}
        placeholder="Start writing. This space is yours…"
        className="resize-y leading-7"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="muted mt-3 flex items-center gap-1.5 text-sm">
          <Check size={14} />
          Notes saved
        </p>
      )}
      {notes !== savedNotes && <p className="muted mt-3 text-xs">You have unsaved changes.</p>}
    </section>
  );
}

function Empty({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: 'file' | 'calendar';
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  const Icon = icon === 'file' ? FileText : CalendarDays;
  return (
    <div className="empty-state px-5 py-10">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--muted-foreground)]">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">{description}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onAction}>
        <Plus size={14} />
        {action}
      </Button>
    </div>
  );
}
