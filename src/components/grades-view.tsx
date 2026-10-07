'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, GraduationCap, Plus } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { calculateGrades } from '@/lib/grades';
import type { Assessment } from '@/lib/types';
import { statusLabel } from './editors/fields';

export function GradesView() {
  const { data, openEditor } = useWorkspace();
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [view, setView] = useState('all');
  const courses = data.courses.filter((course) => archived || !course.archived);
  const available = data.assessments.filter(
    (assessment) =>
      courses.some((course) => course.id === assessment.courseId) &&
      (!courseId || assessment.courseId === courseId),
  );
  const awaiting = available.filter((a) => a.status === 'SUBMITTED').length;
  const recorded = available.filter((a) => a.status === 'GRADED').length;
  const visible = available.filter(
    (a) =>
      (view === 'all' ||
        (view === 'awaiting' ? a.status === 'SUBMITTED' : a.status === 'GRADED')) &&
      a.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-2">EVERY COURSE, ONE PLACE</p>
          <h1>Grades</h1>
          <p>
            Enter scores whenever they arrive. Completed work stays on your awaiting-grades list.
          </p>
        </div>
        <Button onClick={() => openEditor('assessments')}>
          <Plus />
          Add assessment
        </Button>
      </header>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="section-title">
            {awaiting} {awaiting === 1 ? 'assessment awaiting' : 'assessments awaiting'} a grade
          </h2>
          <p className="muted mt-2 text-sm">
            Mark work Completed in its editor to keep it here until a score is recorded. This list
            does not check whether your school has released a grade.
          </p>
        </div>
        <Button variant="outline" onClick={() => setView('awaiting')}>
          Review awaiting grades
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="field min-w-48 flex-1">
          <Label htmlFor="grades-search">Find an assessment</Label>
          <Input
            id="grades-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Assignment, lab, exam…"
          />
        </div>
        <div className="field min-w-48 flex-1">
          <Label htmlFor="grades-course">Course</Label>
          <select
            className="input"
            id="grades-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {data.semesters.find((s) => s.id === course.semesterId)?.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => {
              setArchived(event.target.checked);
              setCourseId('');
            }}
          />
          Include archived courses
        </label>
      </div>
      <div className="tabs" aria-label="Grade views">
        {[
          { id: 'all', label: 'All assessments', count: available.length },
          { id: 'awaiting', label: 'Awaiting grades', count: awaiting },
          { id: 'recorded', label: 'Recorded', count: recorded },
        ].map((item) => (
          <button
            key={item.id}
            className={`tab ${view === item.id ? 'active' : ''}`}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label} <span className="ml-2">{item.count}</span>
          </button>
        ))}
      </div>
      {courses.map((course) => {
        const rows = visible
          .filter((a) => a.courseId === course.id)
          .sort(
            (a, b) =>
              Number(b.status === 'SUBMITTED') - Number(a.status === 'SUBMITTED') ||
              (a.dueDate || '').localeCompare(b.dueDate || ''),
          );
        if (!rows.length) return null;
        const summary = calculateGrades(data.assessments.filter((a) => a.courseId === course.id));
        return (
          <section
            className="card overflow-hidden"
            key={course.id}
            aria-label={`${course.code} grades`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <div>
                <h2 className="section-title">
                  <Link className="underline" href={`/courses/${course.id}`}>
                    {course.code} · {course.name}
                  </Link>
                </h2>
                <p className="muted mt-1 text-xs">
                  {data.semesters.find((s) => s.id === course.semesterId)?.name} · Current weighted
                  grade:{' '}
                  {summary.currentGrade === null
                    ? 'Not available yet'
                    : `${summary.currentGrade.toFixed(1)}%`}
                </p>
              </div>
              <GraduationCap aria-hidden className="text-primary" size={20} />
            </div>
            <div className="divide-y divide-[var(--border)]">
              {rows.map((a) => (
                <GradeRow key={`${a.id}:${a.score}:${a.maxScore}:${a.status}`} assessment={a} />
              ))}
            </div>
          </section>
        );
      })}
      {!visible.length && (
        <div className="card empty-state">
          <GraduationCap aria-hidden size={28} />
          <h2 className="font-semibold">
            {view === 'awaiting' ? 'No grades waiting to be entered' : 'No matching assessments'}
          </h2>
          <p>
            {view === 'awaiting'
              ? 'Completed assessments appear here until you save their grades.'
              : 'Choose another filter or add an assessment to get started.'}
          </p>
          {view !== 'all' && (
            <Button variant="outline" onClick={() => setView('all')}>
              Show all assessments
            </Button>
          )}
        </div>
      )}
      <p className="muted text-sm">
        A blank score means ungraded, not zero. Imported assessments start at 0% weight; use Edit
        details to enter the course weight so they count toward your average.{' '}
        <Link href="/guide#grades" className="underline">
          Grade-entry guide
        </Link>
        .
      </p>
    </div>
  );
}

function GradeRow({ assessment }: { assessment: Assessment }) {
  const { save, openEditor } = useWorkspace();
  const [score, setScore] = useState(assessment.score === null ? '' : String(assessment.score));
  const [maximum, setMaximum] = useState(String(assessment.maxScore));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!score.trim() || !maximum.trim()) throw new Error('Enter a score and its maximum.');
      await save(
        'assessments',
        { score: Number(score), maxScore: Number(maximum), status: 'GRADED' },
        assessment.id,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this grade.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 p-5" aria-label={`Grade for ${assessment.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{assessment.name}</h3>
          <p className="muted mt-1 text-xs">
            {statusLabel(assessment.type)} · {assessment.weight}% of course ·{' '}
            {assessment.status === 'SUBMITTED'
              ? 'Completed · Awaiting grade'
              : statusLabel(assessment.status)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => openEditor('assessments', assessment.id)}
        >
          Edit details
        </Button>
      </div>
      <fieldset disabled={busy} className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="field w-28">
          <Label htmlFor={`grade-score-${assessment.id}`}>Score received</Label>
          <Input
            id={`grade-score-${assessment.id}`}
            type="number"
            min="0"
            max={Number(maximum) || undefined}
            step="0.01"
            required
            value={score}
            onChange={(event) => setScore(event.target.value)}
            placeholder="e.g. 18"
          />
        </div>
        <div className="field w-28">
          <Label htmlFor={`grade-max-${assessment.id}`}>Out of</Label>
          <Input
            id={`grade-max-${assessment.id}`}
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            value={maximum}
            onChange={(event) => setMaximum(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !score.trim()}>
          <Check />
          {busy ? 'Saving…' : 'Save grade'}
        </Button>
        {assessment.status === 'GRADED' && assessment.score !== null && (
          <p className="muted py-3 text-sm">
            Recorded: {((assessment.score / assessment.maxScore) * 100).toFixed(1)}%
          </p>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
