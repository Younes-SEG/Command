import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Command — Your personal command center', template: '%s · Command' },
  description: 'Your courses, tasks, grades, and study plans in one personal workspace.',
};

// Information pages have no database access or private workspace payload.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
