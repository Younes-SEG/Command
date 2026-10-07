import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Terminal } from 'lucide-react';
import { AuthPanel } from '@/components/auth-panel';
import { isAuthConfigured } from '@/lib/server/auth';
import { isHosted } from '@/lib/server/hosting';

export const dynamic = 'force-dynamic';
const views = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'verify-email',
  'sign-out',
]);
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  if (!isHosted()) redirect('/');
  const { path } = await params;
  if (!views.has(path)) notFound();
  const { token } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/auth/sign-in"
          className="mb-8 inline-flex items-center gap-3 text-xl font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Terminal aria-hidden size={24} />
          </span>
          Command
        </Link>
        <section className="card p-7 sm:p-9">
          {isAuthConfigured() ? (
            <AuthPanel mode={path} token={typeof token === 'string' ? token : undefined} />
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Sign-in is being set up</h1>
              <p className="muted mt-4 leading-relaxed">
                Command is online, but account access is not ready yet. Please check back shortly.
                There is nothing for you to install.
              </p>
            </>
          )}
        </section>
        <p className="muted mt-6 text-center text-xs">
          Your courses. Your plans. A little more clarity.
        </p>
        <nav aria-label="Policies" className="muted mt-4 flex justify-center gap-5 text-xs">
          <Link href="/legal/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/legal/terms" className="underline">
            Terms
          </Link>
          <Link href="/legal/accessibility" className="underline">
            Accessibility
          </Link>
        </nav>
      </div>
    </main>
  );
}
