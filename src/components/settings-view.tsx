'use client';

import { useState, type FormEvent } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Settings2,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/components/workspace-provider';
import { formatDate } from '@/lib/dates';
import type { Settings } from '@/lib/types';

export function SettingsView() {
  const { data, save, openEditor } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const semesters = [...data.semesters].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate.localeCompare(a.startDate),
  );

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await save(
        'settings',
        {
          displayName: String(form.get('displayName') ?? '').trim(),
          theme: form.get('theme'),
          timeFormat: form.get('timeFormat'),
          weekStartsOn: Number(form.get('weekStartsOn')),
          showCompleted: form.get('showCompleted') === 'on',
        },
        'preferences',
      );
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save your preferences. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-2">MAKE YOURSELF AT HOME</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="muted mt-2 text-sm">A few thoughtful details to make this space yours.</p>
        </div>
      </header>
      <form
        onSubmit={savePreferences}
        onChange={() => setSaved(false)}
        className="card overflow-hidden"
      >
        <fieldset disabled={busy} className="min-w-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-5 sm:px-7">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
              <Settings2 size={18} />
            </div>
            <div>
              <h2 className="section-title">Your preferences</h2>
              <p className="muted mt-1 text-xs">Little adjustments, a better everyday.</p>
            </div>
          </div>
          <PreferenceFields key={JSON.stringify(data.settings)} settings={data.settings} />
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--muted)]/30 px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            {error ? (
              <p role="alert" className="text-sm text-[var(--destructive)]">
                {error}
              </p>
            ) : saved ? (
              <p role="status" className="flex items-center gap-2 text-sm text-[var(--primary)]">
                <CheckCircle2 size={15} />
                Your preferences are saved.
              </p>
            ) : (
              <p className="muted text-xs">Preferences apply across your workspace.</p>
            )}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {busy ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </form>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="section-title">Semesters</h2>
              <p className="muted mt-1 text-xs">Give each chapter its own space.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => openEditor('semesters')}>
            <Plus size={14} />
            Add semester
          </Button>
        </div>
        {semesters.length ? (
          <div className="divide-y divide-[var(--border)]">
            {semesters.map((semester) => {
              const count = data.courses.filter(
                (course) => course.semesterId === semester.id,
              ).length;
              return (
                <button
                  type="button"
                  key={semester.id}
                  onClick={() => openEditor('semesters', semester.id)}
                  className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--muted)]/50 sm:px-7"
                >
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${semester.isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
                  >
                    <CalendarDays size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{semester.name}</h3>
                      {semester.isActive && (
                        <span className="badge text-[var(--primary)]">Active</span>
                      )}
                    </div>
                    <p className="muted mt-1.5 text-xs leading-relaxed">
                      {formatDate(semester.startDate.slice(0, 10), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      –{' '}
                      {formatDate(semester.endDate.slice(0, 10), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      <span className="ml-2">
                        · {count} {count === 1 ? 'course' : 'courses'}
                      </span>
                    </p>
                  </div>
                  <Pencil size={15} className="muted shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state px-6 py-12">
            <CalendarDays size={30} className="muted mx-auto mb-4" />
            <h3 className="font-semibold">Your next chapter starts here</h3>
            <p className="muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              Create a semester before adding your courses. Its dates also define when weekly
              classes appear.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => openEditor('semesters')}>
              <Plus size={15} />
              Create your first semester
            </Button>
          </div>
        )}
        <p className="muted border-t border-[var(--border)] px-5 py-4 text-xs leading-relaxed sm:px-7">
          The active semester is selected by default for new courses. Select a semester to edit its
          dates, change its active status, or delete it.
        </p>
      </section>
    </div>
  );
}

function PreferenceFields({ settings }: { settings: Settings }) {
  return (
    <div className="divide-y divide-[var(--border)] px-5 sm:px-7">
      <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <Label htmlFor="settings-name">What should we call you?</Label>
          <p className="muted mt-2 text-xs leading-relaxed">A name for your dashboard greeting.</p>
        </div>
        <Input
          id="settings-name"
          name="displayName"
          defaultValue={settings.displayName}
          maxLength={80}
          placeholder="Your first name"
          autoComplete="given-name"
        />
      </div>
      <fieldset className="min-w-0 py-6">
        <legend className="float-left w-full text-sm font-medium">Appearance</legend>
        <div className="clear-both pt-2">
          <p className="muted mb-4 text-xs">Choose your favorite look, or follow your device.</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'LIGHT', label: 'Light', Icon: Sun },
                { value: 'DARK', label: 'Dark', Icon: Moon },
                { value: 'SYSTEM', label: 'System', Icon: Monitor },
              ] as const
            ).map(({ value, label, Icon }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  defaultChecked={settings.theme === value}
                  className="peer sr-only"
                />
                <div className="rounded-xl border-2 border-[var(--border)] p-2 transition-colors peer-checked:border-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2 sm:p-3">
                  <ThemePreview theme={value} />
                  <span className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium sm:text-sm">
                    <Icon size={14} />
                    {label}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
      <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <h3 className="text-sm font-medium">Date & time</h3>
          <p className="muted mt-2 text-xs leading-relaxed">Make the calendar feel familiar.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <Label htmlFor="settings-time">Time format</Label>
            <select
              id="settings-time"
              name="timeFormat"
              defaultValue={settings.timeFormat}
              className="input"
            >
              <option value="12">12-hour · 2:30 PM</option>
              <option value="24">24-hour · 14:30</option>
            </select>
          </div>
          <div className="field">
            <Label htmlFor="settings-week">Week starts on</Label>
            <select
              id="settings-week"
              name="weekStartsOn"
              defaultValue={settings.weekStartsOn}
              className="input"
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <h3 className="text-sm font-medium">A little less clutter</h3>
          <p className="muted mt-2 text-xs leading-relaxed">Choose how finished work appears.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="showCompleted"
            defaultChecked={settings.showCompleted}
            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            <span className="text-sm font-medium">Show completed tasks</span>
            <span className="muted mt-1.5 block text-xs leading-relaxed">
              Include completed tasks on Home and in the calendar. They’re always available in
              Tasks.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function ThemePreview({ theme }: { theme: Settings['theme'] }) {
  const dark = theme === 'DARK';
  return (
    <div
      aria-hidden="true"
      className="relative flex h-16 overflow-hidden rounded-md border border-black/10 sm:h-20"
      style={{ backgroundColor: dark ? '#24252b' : '#faf9f6' }}
    >
      <div
        className="w-[25%] border-r border-black/5 px-1.5 py-2 sm:px-2"
        style={{ backgroundColor: dark ? '#1a1b20' : '#eeede9' }}
      >
        <div className="mb-2 h-1.5 w-3 rounded bg-[#9b8bdd]" />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="mb-1.5 h-1 rounded"
            style={{ backgroundColor: dark ? '#393941' : '#d8d6d1' }}
          />
        ))}
      </div>
      <div className="flex-1 px-2 py-3">
        <div
          className="mb-3 h-1.5 w-1/2 rounded"
          style={{ backgroundColor: dark ? '#65636e' : '#bbb8b1' }}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-6 rounded border border-[#9b8bdd]/30 bg-[#9b8bdd]/15" />
          <div className="h-6 rounded" style={{ backgroundColor: dark ? '#32333a' : '#e9e7e2' }} />
        </div>
      </div>
      {theme === 'SYSTEM' && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[#12121c]/75 mix-blend-multiply" />
      )}
    </div>
  );
}
