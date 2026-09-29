'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card empty-state min-h-96">
      <h1 className="text-xl font-semibold text-foreground">
        Something interrupted your workspace.
      </h1>
      <p>Your saved data is safe. Please try loading this page again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
