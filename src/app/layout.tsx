import type { Metadata } from 'next';
import { getWorkspace } from '@/lib/server/workspace';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { AppShell } from '@/components/app-shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Command — Your personal command center', template: '%s · Command' },
  description:
    'A clear view of your university life. Courses, tasks, grades, and your day, together.',
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A per-request server timestamp keeps the first client render identical to its HTML.
  // eslint-disable-next-line react-hooks/purity
  const initialNow = Date.now();
  let data;
  try {
    data = await getWorkspace();
  } catch {
    /* The setup screen gives a recoverable path when PostgreSQL is offline. */
  }
  return (
    <html
      lang="en"
      className={data?.settings.theme === 'DARK' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <body>
        {data ? (
          <WorkspaceProvider initialData={data} initialNow={initialNow}>
            <AppShell>{children}</AppShell>
          </WorkspaceProvider>
        ) : (
          <main className="min-h-screen grid place-items-center p-6">
            <div className="card p-9 max-w-lg">
              <div className="eyebrow mb-4">Command · Personal workspace</div>
              <h1 className="text-2xl font-semibold tracking-tight mb-3">
                Let&apos;s get your workspace ready.
              </h1>
              <p className="muted leading-relaxed mb-6">
                Command couldn&apos;t connect to your database. Start your local database, then
                return here to pick up where you left off.
              </p>
              <div className="bg-muted rounded-lg p-4 text-xs font-mono space-y-2">
                <p>npm run db:local</p>
                <p>npm run setup</p>
              </div>
              <p className="muted text-xs my-5">
                For an existing PostgreSQL server, check DATABASE_URL in .env. Your data stays in
                your database.
              </p>
              <form action="/" method="get">
                <button className="button button-primary inline-flex px-4 py-2 text-sm">
                  Try again
                </button>
              </form>
            </div>
          </main>
        )}
      </body>
    </html>
  );
}
