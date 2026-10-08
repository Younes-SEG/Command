'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, UserPlus } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui/button';
import { Input } from './ui/input';

function passwordError(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  if (error.code === 'PASSWORD_TOO_SHORT') return 'Choose a longer password.';
  if (error.code === 'PASSWORD_TOO_LONG') return 'Choose a shorter password.';
  // Neon normalizes both length errors to this code and throws them from the SDK.
  if (error.code === 'weak_password')
    return 'The sign-in service could not accept that password. Try a password between 8 and 128 characters.';
  return null;
}

export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        className={className || 'button button-outline'}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error();
            // Full navigation discards all in-memory workspace data and router caches.
            window.location.replace('/auth/sign-in');
          } catch {
            setError('Could not sign out. Please try again.');
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthPanel({ mode, token }: { mode: string; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const signUp = mode === 'sign-up';
  const signIn = mode === 'sign-in';
  const reset = mode === 'reset-password';
  const verify = mode === 'verify-email';
  const passwordNeeded = signIn || signUp || reset;
  const titles: Record<string, string> = {
    'sign-in': 'Welcome back',
    'sign-up': 'Your space to study',
    'forgot-password': 'Reset your password',
    'reset-password': 'Choose a new password',
    'verify-email': 'Check your email',
    'sign-out': 'Sign out of Command',
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    const origin = window.location.origin;
    try {
      if (signIn) {
        const result = await authClient.signIn.email({ email, password });
        if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
          window.location.replace('/auth/verify-email');
          return;
        }
        if (result.error)
          throw new Error(
            'Unable to sign in. Check your email and password, or reset your password.',
          );
        window.location.replace('/');
        return;
      }
      if (signUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name: String(values.get('name') || '').trim() || 'Student',
          callbackURL: `${origin}/`,
        });
        if (result.error)
          throw new Error(
            passwordError(result.error) ||
              'Unable to create this account. Try signing in or resetting your password if you already have an account.',
          );
        setNotice(
          'Check your inbox for a verification link, then sign in. Your workspace will start empty.',
        );
      } else if (reset) {
        if (!token) throw new Error('This reset link is incomplete. Request a new one.');
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error)
          throw new Error(
            passwordError(result.error) ||
              'This reset link is invalid or expired. Request a new one.',
          );
        setNotice('Password updated. You can now sign in with your new password.');
      } else if (verify) {
        const result = await authClient.sendVerificationEmail({ email, callbackURL: `${origin}/` });
        if (result.error && result.error.status >= 500)
          throw new Error('Email is temporarily unavailable. Please try again later.');
        setNotice(
          'If your account needs verification, a new link is on its way. Check your inbox and spam folder.',
        );
      } else {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${origin}/auth/reset-password`,
        });
        if (result.error && result.error.status >= 500)
          throw new Error('Email is temporarily unavailable. Please try again later.');
        setNotice(
          'If an account uses that email, you will receive a password-reset link. Check your inbox and spam folder.',
        );
      }
    } catch (failure) {
      setError(
        passwordError(failure) ||
          (failure instanceof Error ? failure.message : 'Please try again later.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{titles[mode]}</h1>
      <p className="muted mt-3 leading-relaxed">
        {verify
          ? 'Verify your email before opening your private workspace. You can request another link below.'
          : signUp
            ? 'Keep your courses, grades and plans together in your own private workspace.'
            : signIn
              ? 'Sign in to pick up where you left off.'
              : 'Manage access to your private workspace.'}
      </p>
      {mode === 'sign-out' ? (
        <div className="mt-6">
          <SignOutButton />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-5">
          {signUp && (
            <label className="block space-y-2 text-sm font-medium">
              <span>
                Name <span className="muted">(optional)</span>
              </span>
              <Input name="name" autoComplete="nickname" maxLength={80} disabled={busy} />
            </label>
          )}
          {!reset && (
            <label className="block space-y-2 text-sm font-medium">
              <span>Email</span>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
          )}
          {passwordNeeded && (
            <label className="block space-y-2 text-sm font-medium">
              <span id="auth-password-label">{reset ? 'New password' : 'Password'}</span>
              <Input
                name="password"
                type="password"
                autoComplete={signIn ? 'current-password' : 'new-password'}
                required
                disabled={busy}
                aria-labelledby="auth-password-label"
              />
            </label>
          )}
          {signUp && (
            <p className="muted text-xs leading-relaxed">
              Creating an account uses Neon Auth to handle your email and password. Read our{' '}
              <Link href="/legal/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline">
                Privacy policy
              </Link>
              .
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
              {notice}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy || (reset && !token)}>
            {busy
              ? 'Please wait…'
              : signIn
                ? 'Sign in'
                : signUp
                  ? 'Create account'
                  : reset
                    ? 'Update password'
                    : verify
                      ? 'Resend verification email'
                      : 'Send reset link'}
          </Button>
          {signIn && (
            <div className="flex justify-center">
              <Link href="/auth/forgot-password" className="auth-action auth-action-recovery">
                <KeyRound size={16} aria-hidden="true" />
                Forgot your password?
              </Link>
            </div>
          )}
        </form>
      )}
      <div className="mt-7 border-t border-border pt-5 text-sm">
        {signIn ? (
          <div className="auth-signup">
            <p className="muted text-center">New to Command?</p>
            <Link href="/auth/sign-up" className="auth-action auth-action-signup">
              <UserPlus size={18} aria-hidden="true" />
              <span>Create an account</span>
              <ArrowRight size={18} aria-hidden="true" className="auth-action-arrow ml-auto" />
            </Link>
          </div>
        ) : (
          <Link href="/auth/sign-in" className="auth-action auth-action-recovery">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </Link>
        )}
      </div>
    </>
  );
}
