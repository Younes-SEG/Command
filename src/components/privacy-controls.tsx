'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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

export function PrivacyControls() {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function erase() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/privacy/erase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to erase data.');
      window.location.replace('/settings');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
      setBusy(false);
    }
  }
  return (
    <section
      id="your-data"
      className="card scroll-mt-6 space-y-4 p-5 sm:p-7"
      aria-labelledby="your-data-title"
    >
      <h2 id="your-data-title" className="section-title">
        Your data
      </h2>
      <p className="muted text-sm leading-relaxed">
        Your workspace is stored in this installation. No account or identity check is needed to
        access or delete it.{' '}
        <Link href="/legal/privacy" className="underline">
          Read the privacy policy
        </Link>
        .
      </p>
      <div className="space-y-2">
        <Button asChild variant="outline">
          <a href="/api/privacy/export" download="command-data.json">
            Download my data
          </a>
        </Button>
        <p className="muted text-xs leading-relaxed">
          Downloads a readable JSON copy of your academic records and preferences, excluding private
          calendar links. Keep it private. This is not an automatic restore backup.
        </p>
      </div>
      <Dialog
        onOpenChange={() => {
          setConfirmation('');
          setError('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="text-[var(--destructive)]">
            Erase workspace data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erase this workspace?</DialogTitle>
            <DialogDescription>
              This permanently deletes all courses, grades, notes, tasks, events, semesters, saved
              calendar links and preferences from the active application database. Calendar syncing
              stops. This cannot be undone here.
            </DialogDescription>
          </DialogHeader>
          <p className="muted mb-4 text-sm">
            It does not remove downloaded files, backups, database logs or your provider’s calendar.
            Download a copy first if you need one.
          </p>
          <div className="field">
            <Label htmlFor="erase-confirmation">Type DELETE MY DATA to confirm</Label>
            <Input
              id="erase-confirmation"
              value={confirmation}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy || confirmation !== 'DELETE MY DATA'}
              onClick={() => void erase()}
            >
              {busy ? 'Erasing…' : 'Permanently erase data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
