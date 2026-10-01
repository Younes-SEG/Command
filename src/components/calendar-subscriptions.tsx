'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, Link2, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useWorkspace } from './workspace-provider';
import { currentTerm, type FeedPreview } from '@/lib/calendar-feed';
import { calendarNoticeVersion } from '@/lib/legal';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';

interface Subscription {
  id: string;
  enabled: boolean;
  name: string;
  fromDate: string;
  throughDate: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  itemCount: number;
}

export function CalendarSubscriptions() {
  const { now, refresh } = useWorkspace();
  const [options, setOptions] = useState(() => currentTerm(now));
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/calendar-subscriptions', { cache: 'no-store' });
        if (!response.ok)
          throw new Error('Unable to load calendar connections. Please reload the page.');
        const rows: Subscription[] = await response.json();
        if (!cancelled) setSubscriptions(rows);
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Unable to load calendars.');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function perform(action: string, id?: string) {
    setBusy(id || action);
    setError('');
    setMessage('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id,
          url,
          ...options,
          timeZone,
          consentVersion: calendarNoticeVersion,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to connect this calendar.');
      if (action === 'preview') setPreview(result);
      else {
        setSubscriptions(result);
        if (action === 'connect') {
          setUrl('');
          setPreview(null);
        }
        await refresh();
        setMessage(
          action === 'forget'
            ? 'Saved link forgotten. Your imported entries are still here.'
            : action === 'disconnect'
              ? 'Disconnected. Your imported entries are still here.'
              : action === 'connect'
                ? 'Calendar connected. Your courses, deadlines and events are ready.'
                : 'Calendar is up to date.',
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy('');
    }
  }

  function onPreview(event: FormEvent) {
    event.preventDefault();
    void perform('preview');
  }
  const deadlines =
    preview?.items.filter((item) => item.course && item.deadline && !item.cancelled).length || 0;
  const count = preview?.items.filter((item) => !item.cancelled).length || 0;
  const courses = [
    ...new Map(
      preview?.items
        .filter((item) => item.course && !item.cancelled)
        .map((item) => [item.course!.code, item.course!]),
    ).values(),
  ];

  return (
    <section className="card overflow-hidden" id="calendar-connections">
      <div className="flex items-center gap-3 border-b border-[var(--border)] p-5 sm:px-7">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
          <Link2 size={18} />
        </div>
        <div>
          <h2 className="section-title">Connect your calendar</h2>
          <p className="muted mt-1 text-xs">
            Paste your Brightspace subscription link. Command takes care of the dates.
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:px-7">
        <form onSubmit={onPreview} className="space-y-4">
          <fieldset disabled={!!busy} className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calendar-link">Calendar subscription link</Label>
              <Input
                id="calendar-link"
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                aria-describedby="calendar-link-help calendar-preview-notice"
                value={url}
                placeholder="https://… or webcal://…"
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreview(null);
                  setMessage('');
                }}
              />
              <p id="calendar-link-help" className="muted text-xs leading-relaxed">
                In Brightspace: Calendar → Settings → Enable Calendar Feeds, then Subscribe → copy
                the link. Choose all calendars to include all your courses.
              </p>
            </div>
            <details className="rounded-xl border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm">
                Import dates: {options.fromDate} to {options.throughDate}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calendar-from">From</Label>
                  <Input
                    id="calendar-from"
                    type="date"
                    required
                    value={options.fromDate}
                    onChange={(e) => {
                      setOptions({ ...options, fromDate: e.target.value });
                      setPreview(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-through">Through</Label>
                  <Input
                    id="calendar-through"
                    type="date"
                    required
                    value={options.throughDate}
                    onChange={(e) => {
                      setOptions({ ...options, throughDate: e.target.value });
                      setPreview(null);
                    }}
                  />
                </div>
              </div>
              <p className="muted mt-3 text-xs">
                Starts with the current term so old courses stay out. Sync uses this range until you
                reconnect with different dates.
              </p>
            </details>
            <p id="calendar-preview-notice" className="muted text-xs leading-relaxed">
              Preview asks your calendar provider for the feed through this local app. The provider
              receives your network address and feed credential. Nothing is saved until you connect.
              Use only a link you are authorized to access.{' '}
              <Link className="underline" href="/legal/privacy">
                Calendar privacy details
              </Link>
              .
            </p>
            <Button type="submit" variant="outline" disabled={!url.trim() || !!busy}>
              {busy === 'preview' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CalendarDays size={15} />
              )}
              Preview calendar
            </Button>
          </fieldset>
        </form>
        {preview && (
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
            <div>
              <h3 className="font-medium break-words">{preview.name}</h3>
              <p className="muted mt-1 text-sm">
                {courses.length} courses · {deadlines} deadlines · {count - deadlines} other events
                in this date range
              </p>
            </div>
            {courses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <span key={course.code} className="badge" title={course.name}>
                    {course.code}
                  </span>
                ))}
              </div>
            )}
            {!count ? (
              <p className="text-sm">
                No events in these dates. Expand the import dates and preview again.
              </p>
            ) : (
              <>
                <ul
                  className="max-h-64 space-y-3 overflow-y-auto text-sm"
                  aria-label="Calendar import preview"
                >
                  {preview.items
                    .filter((item) => !item.cancelled)
                    .slice(0, 100)
                    .map((item) => (
                      <li
                        key={item.key}
                        className="flex flex-wrap justify-between gap-1 border-b border-[var(--border)] pb-2"
                      >
                        <span className="min-w-0 break-words">
                          {item.title}
                          <span className="muted ml-2 text-xs">
                            {item.course?.code || 'Calendar event'}
                          </span>
                        </span>
                        <span className="muted text-xs">
                          {new Date(item.startAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </li>
                    ))}
                </ul>
                {count > 100 && (
                  <p className="muted text-xs">Showing the first 100 of {count} entries.</p>
                )}
                <p className="muted text-xs leading-relaxed">
                  Matching courses are reused; missing courses are created. Deadlines become
                  assessments with no grade and 0% weight until you fill those in. Availability
                  notices stay calendar events.
                </p>
                <p id="calendar-connect-notice" className="text-sm leading-relaxed">
                  By choosing Connect and import, you authorize Command to store this private link
                  and import and refresh its calendar data every 15 minutes while running. You can
                  disconnect or forget it below at any time.
                </p>
                <Button
                  aria-describedby="calendar-connect-notice"
                  disabled={!!busy}
                  onClick={() => void perform('connect')}
                >
                  {busy === 'connect' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Link2 size={15} />
                  )}
                  Connect and import
                </Button>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-[var(--primary)]">
            {message}{' '}
            {message.startsWith('Calendar connected') && (
              <Link href="/calendar" className="underline">
                View calendar
              </Link>
            )}
          </p>
        )}
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="space-y-3 border-t border-[var(--border)] pt-4">
            <div>
              <h3 className="text-sm font-medium break-words">{subscription.name}</h3>
              {!subscription.enabled && (
                <p className="mt-1 text-sm">Disconnected · Saved link retained</p>
              )}
              <p className="muted mt-1 text-xs">
                {subscription.itemCount} imported entries · {subscription.fromDate} to{' '}
                {subscription.throughDate}
              </p>
              <p className="muted mt-1 text-xs">
                {subscription.lastSyncedAt
                  ? `Last synced ${new Date(subscription.lastSyncedAt).toLocaleString()}`
                  : 'Waiting for first sync'}
              </p>
            </div>
            {subscription.lastError && (
              <p role="alert" className="text-sm text-[var(--destructive)]">
                {subscription.lastError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy || !subscription.enabled}
                onClick={() => void perform('sync', subscription.id)}
              >
                {busy === subscription.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Sync now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!!busy || !subscription.enabled}
                onClick={() => void perform('disconnect', subscription.id)}
              >
                <Unplug size={14} />
                Disconnect
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!!busy}>
                    Forget link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Forget this calendar link?</DialogTitle>
                    <DialogDescription>
                      The saved private URL and sync mapping for {subscription.name} will be
                      deleted. Imported courses and entries stay in your workspace. Reconnecting
                      after this may create duplicates.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button onClick={() => void perform('forget', subscription.id)}>
                        Forget saved link
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
        <p className="muted text-xs leading-relaxed">
          Checks every 15 minutes while the Command server is running, even if you close this tab.
          Catches up after restart. Grades and notes stay yours. Entries that disappear from the
          feed are kept for review; explicit cancellations are labelled. Disconnecting keeps
          imported entries and remembers this feed for reconnection.
        </p>
      </div>
    </section>
  );
}
