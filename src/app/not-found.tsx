import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1 className="text-2xl font-semibold text-foreground">
        This page isn&apos;t in your workspace.
      </h1>
      <Link href="/" className="text-primary">
        Back to home →
      </Link>
    </div>
  );
}
