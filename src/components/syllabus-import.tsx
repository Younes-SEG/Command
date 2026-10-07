'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileText, Plus, Upload } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { assessmentNameKey, type SyllabusSuggestion } from '@/lib/syllabus';
import type { SyllabusPreview } from '@/lib/syllabus-result';
import { dateKey, toDateTimeLocal } from '@/lib/dates';
import type { AssessmentType } from '@/lib/types';

type Row = SyllabusSuggestion & {
  id: number;
  selected: boolean;
  existingId: string;
  weightText: string;
};
const types: AssessmentType[] = [
  'ASSIGNMENT',
  'LAB',
  'QUIZ',
  'MIDTERM',
  'FINAL_EXAM',
  'PROJECT',
  'OTHER',
];

export function SyllabusImport({ initialCourseId }: { initialCourseId?: string }) {
  const { data, refresh, openEditor } = useWorkspace();
  const uploadLimitMB = data.hosted ? 4 : 8;
  const [courseId, setCourseId] = useState(initialCourseId || '');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const pendingRead = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/syllabus/preview', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const status = await response.json();
        setConfigured(status.configured === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setConfigured(false);
          setError('Could not reach the syllabus reader. Check your connection and try again.');
        }
      });
    return () => {
      controller.abort();
      pendingRead.current?.abort();
    };
  }, [statusAttempt]);
  const course = data.courses.find((item) => item.id === courseId);
  const semester = data.semesters.find((item) => item.id === course?.semesterId);
  const existing = data.assessments.filter((item) => item.courseId === courseId);
  const selected = rows?.filter((row) => row.selected) || [];
  let total = existing.reduce((sum, item) => sum + item.weight, 0);
  for (const row of selected) {
    const match = existing.find((item) => item.id === row.existingId);
    total +=
      (row.weightText === '' ? (match?.weight ?? 0) : Number(row.weightText)) -
      (match?.weight ?? 0);
  }

  function clearReview() {
    setRows(null);
    setReviewed(false);
    setNotice('');
    setError('');
  }
  function update(id: number, patch: Partial<Row>) {
    setRows(
      (current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? null,
    );
    setReviewed(false);
    setError('');
  }
  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(pdf|txt)$/i.test(file.name)) {
      setError('Choose a PDF or a .txt file. For Word documents, export to PDF or paste the text.');
      return;
    }
    if (file.size > uploadLimitMB * 1024 * 1024) {
      setError(`Choose a file smaller than ${uploadLimitMB} MB.`);
      return;
    }
    setText('');
    setFileName(file.name);
    await analyse(file);
  }
  function showSuggestions(result: SyllabusPreview) {
    setRows(
      result.items.map((item) => {
        const matches = existing.filter(
          (a) => assessmentNameKey(a.name) === assessmentNameKey(item.name),
        );
        const match = matches.length === 1 ? matches[0] : undefined;
        return {
          ...item,
          id: nextId.current++,
          selected: !item.grouped,
          existingId: match?.id || '',
          weightText: item.weight === null ? '' : String(item.weight),
        };
      }),
    );
    setWarnings(result.warnings);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }
  async function analyse(source: File | string) {
    if (pendingRead.current || !semester || !configured) return;
    clearReview();
    const controller = new AbortController();
    pendingRead.current = controller;
    setBusy(true);
    try {
      const response = await fetch('/api/syllabus/preview', {
        method: 'POST',
        headers: {
          'Content-Type':
            typeof source !== 'string' && /\.pdf$/i.test(source.name)
              ? 'application/pdf'
              : 'text/plain',
          'X-Command-Course': courseId,
        },
        body: source,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The syllabus could not be read.');
      if (!controller.signal.aborted) showSuggestions(result);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : 'The syllabus could not be read.');
    } finally {
      pendingRead.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function extract(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setFileName('');
    await analyse(text);
  }
  function matchRow(row: Row, id: string) {
    const match = existing.find((item) => item.id === id);
    update(row.id, { existingId: id, ...(match ? { name: match.name, type: match.type } : {}) });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/syllabus/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          reviewed,
          items: selected.map((row) => ({
            existingId: row.existingId || null,
            name: row.name,
            type: row.type,
            dueDate: row.date
              ? new Date(`${row.date}T${row.time || '23:59'}:00`).toISOString()
              : null,
            weight: row.weightText === '' ? null : Number(row.weightText),
            source: `${row.page ? `Source page ${row.page}\n` : ''}${row.source}`,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The import could not be saved.');
      setRows(null);
      setReviewed(false);
      setText('');
      setFileName('');
      setNotice(
        `Saved: ${result.created} new assessments and ${result.updated} updated assessments.`,
      );
      try {
        await refresh();
      } catch {
        setNotice('Import saved. Refresh this page to see your updated assessments.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">FROM COURSE OUTLINE TO STUDY PLAN</p>
          <h1>Import syllabus</h1>
          <p>Find assessment dates and grade weights, then review them before saving.</p>
        </div>
        <FileText aria-hidden size={28} className="text-primary" />
      </header>
      <p className="muted text-sm leading-relaxed">
        Choose your course, then upload a syllabus to find assessments automatically. Review the
        suggested dates and weights before saving them to your course.
      </p>
      {configured === false && (
        <div role="status" className="card space-y-2 p-5">
          <p className="font-medium">Syllabus reading is currently unavailable</p>
          <p className="muted text-sm">
            Please try again later. There is nothing for you to set up. You can still add
            assessments manually and use your courses and grades.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfigured(null);
              setError('');
              setStatusAttempt((attempt) => attempt + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--danger)] p-4 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}
      {notice && (
        <div role="status" className="card space-y-3 p-5">
          <p>{notice}</p>
          <Link className="text-primary underline" href={`/courses/${courseId}`}>
            View course assessments
          </Link>
        </div>
      )}
      <form onSubmit={extract} className="card space-y-5 p-5 sm:p-6">
        <h2 className="section-title">1. Choose a course and syllabus</h2>
        <label className="block space-y-2 text-sm font-medium">
          <span>Course</span>
          <select
            className="input"
            required
            value={courseId}
            disabled={busy}
            onChange={(e) => {
              setCourseId(e.target.value);
              setFileName('');
              clearReview();
            }}
          >
            <option value="">Choose a course</option>
            {data.courses
              .filter((c) => !c.archived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({data.semesters.find((s) => s.id === c.semesterId)?.name})
                </option>
              ))}
          </select>
        </label>
        {!data.courses.some((c) => !c.archived) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => openEditor(data.semesters.length ? 'courses' : 'semesters')}
          >
            <Plus />
            Create a {data.semesters.length ? 'course' : 'semester'} first
          </Button>
        )}
        {semester && (
          <p className="muted text-xs">
            Dates without a year use {semester.name}: {semester.startDate.slice(0, 10)} to{' '}
            {semester.endDate.slice(0, 10)}.
          </p>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Upload syllabus (PDF or TXT, up to {uploadLimitMB} MB)
          </p>
          <p className="muted text-xs leading-relaxed" id="syllabus-ai-notice">
            Uploading a file or analysing pasted text sends it and the selected course name and term
            to Command’s online reader and OpenAI for processing. No AI account or setup is needed.
            Command does not keep the original file; the provider’s data retention rules apply.{' '}
            <Link href="/guide#syllabus-privacy" className="underline">
              How your syllabus is handled
            </Link>
          </p>
          <input
            ref={fileInput}
            hidden
            type="file"
            aria-label={`Upload syllabus (PDF or TXT, up to ${uploadLimitMB} MB)`}
            accept=".pdf,.txt,application/pdf,text/plain"
            disabled={busy || !configured || !semester}
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="syllabus-file-picker"
            disabled={busy || !configured || !semester}
            onClick={() => fileInput.current?.click()}
            aria-labelledby="syllabus-file-action"
            aria-describedby="syllabus-file-status syllabus-file-help syllabus-ai-notice"
          >
            <span
              id="syllabus-file-action"
              className="flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <Upload size={18} aria-hidden />
              Choose a file
            </span>
            <span
              id="syllabus-file-status"
              className="muted block break-all text-xs"
              aria-live="polite"
            >
              {fileName || 'No file chosen'}
            </span>
          </button>
        </div>
        <p id="syllabus-file-help" className="muted text-xs">
          {configured === null
            ? 'Connecting to the reader… '
            : !semester
              ? 'Choose a course first. '
              : ''}
          PDFs up to 60 pages, including scanned pages. Clear text and images give better results.
          For a Word file, export to PDF or paste its text below.
        </p>
        {busy && rows === null && (
          <p role="status" className="text-sm text-primary">
            Reading your syllabus and checking dates and weights… This may take a minute or two.
          </p>
        )}
        <details className="space-y-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Or paste syllabus text
          </summary>
          <label className="block space-y-2 text-sm font-medium">
            <span>Syllabus text</span>
            <Textarea
              rows={8}
              maxLength={100000}
              disabled={busy}
              value={text}
              placeholder={
                'Paste your syllabus, for example:\nMidterm 1 — October 20, 2026 at 14:00 — 25%\nAssignment 1 — November 2, 2026 at 23:59 — 10%'
              }
              onChange={(e) => {
                setText(e.target.value);
                setFileName('');
                clearReview();
              }}
            />
          </label>
          <Button type="submit" disabled={busy || !configured || !semester || !text.trim()}>
            <Upload />
            {busy ? 'Reading…' : 'Find assessments from text'}
          </Button>
        </details>
      </form>
      {rows !== null && (
        <form onSubmit={save} className="space-y-4">
          <div className="card space-y-3 p-5 sm:p-6">
            <h2 ref={reviewHeading} tabIndex={-1} className="section-title">
              2. Review suggestions
            </h2>
            <p className="muted text-sm">
              {rows.length
                ? `${rows.length} suggestions found.`
                : 'No assessments found. Try a clearer PDF or paste the grading and schedule sections, or add rows below.'}{' '}
              Compare these with the original syllabus. Grouped grading rules start deselected.
            </p>
            <p className="muted text-sm">
              Match calendar imports to existing assessments to avoid duplicates. Matches update
              only dates and weights; scores, progress, names and notes stay intact. Blank fields
              preserve existing dates and weights. For new assessments, blank weight means 0% and
              blank date means no deadline.
            </p>
            <p className="muted text-sm">
              Times use your device time zone. A date with no time uses 23:59. Calendar sync can
              later replace the dates of calendar-linked assessments.
            </p>
            {warnings.map((warning) => (
              <p key={warning} className="text-sm">
                {warning}
              </p>
            ))}
          </div>
          {rows.map((row, index) => {
            const match = existing.find((item) => item.id === row.existingId);
            return (
              <fieldset key={row.id} className="card min-w-0 space-y-4 p-5 sm:p-6" disabled={busy}>
                <legend className="px-2 text-sm font-semibold">Assessment {index + 1}</legend>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => update(row.id, { selected: e.target.checked })}
                  />
                  Include this assessment
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Save as</span>
                  <select
                    className="input"
                    value={row.existingId}
                    onChange={(e) => matchRow(row, e.target.value)}
                  >
                    <option value="">New assessment</option>
                    {existing.map((a) => (
                      <option key={a.id} value={a.id}>
                        Update: {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                {match && (
                  <p className="muted text-xs">
                    Current weight: {match.weight}%. Current deadline:{' '}
                    {match.dueDate
                      ? `${dateKey(match.dueDate)} ${toDateTimeLocal(match.dueDate).slice(11)}`
                      : 'none'}
                    .
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Name</span>
                    <Input
                      value={row.name}
                      maxLength={200}
                      required={row.selected}
                      disabled={!!match}
                      onChange={(e) => update(row.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Type</span>
                    <select
                      className="input"
                      value={row.type}
                      disabled={!!match}
                      onChange={(e) => update(row.id, { type: e.target.value as AssessmentType })}
                    >
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span>Due date</span>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => update(row.id, { date: e.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Due time</span>
                    <Input
                      type="time"
                      value={row.time}
                      onChange={(e) => update(row.id, { time: e.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Grade weight (%)</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder={match ? `Keep ${match.weight}%` : 'Not found'}
                      value={row.weightText}
                      onChange={(e) => update(row.id, { weightText: e.target.value })}
                    />
                  </label>
                </div>
                {!!row.warnings.length && (
                  <ul className="muted list-disc space-y-1 pl-5 text-xs">
                    {row.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
                {row.source && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary">
                      View source excerpt{row.page ? ` · page ${row.page}` : ''}
                    </summary>
                    <p className="muted mt-3 whitespace-pre-wrap break-words rounded-lg bg-[var(--muted)] p-3 leading-relaxed">
                      {row.source}
                    </p>
                  </details>
                )}
              </fieldset>
            );
          })}
          <Button
            type="button"
            variant="outline"
            disabled={busy || rows.length >= 100}
            onClick={() => {
              setRows([
                ...rows,
                {
                  id: nextId.current++,
                  name: '',
                  type: 'ASSIGNMENT',
                  date: '',
                  time: '',
                  weight: null,
                  weightText: '',
                  source: '',
                  warnings: [],
                  grouped: false,
                  existingId: '',
                  selected: true,
                },
              ]);
              setReviewed(false);
            }}
          >
            <Plus />
            Add missed assessment
          </Button>
          <div className="card space-y-4 p-5 sm:p-6">
            <h2 className="section-title">3. Save to {course?.code}</h2>
            <p className="text-sm">
              {selected.length} selected · Course weight after import:{' '}
              {Number.isFinite(total) ? total.toFixed(2) : '—'}%
            </p>
            {total > 100.000001 && (
              <p className="text-sm text-[var(--danger)]">
                Adjust weights or matches so the course total is at most 100%.
              </p>
            )}
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1"
                required
                checked={reviewed}
                disabled={busy}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                I checked the selected dates, times, individual weights and matches against my
                syllabus.
              </span>
            </label>
            <Button
              disabled={busy || !reviewed || !selected.length || !course || total > 100.000001}
            >
              {busy ? 'Saving…' : 'Save reviewed assessments'}
            </Button>
            <p className="muted text-xs">
              This imports a snapshot. Later changes to your syllabus need another review.
            </p>
          </div>
        </form>
      )}
      <Link className="inline-block text-sm text-primary underline" href="/guide#syllabus">
        Help with syllabus imports
      </Link>
    </div>
  );
}
