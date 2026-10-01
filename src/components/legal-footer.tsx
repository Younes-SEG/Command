import Link from 'next/link';

export function LegalFooter() {
  return (
    <footer className="legal-footer" aria-label="Legal and privacy information">
      <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/cookies">Cookies</Link>
        <Link href="/legal/accessibility">Accessibility</Link>
        <Link href="/legal/credits">Credits</Link>
        <Link href="/legal/about">About & contact</Link>
      </nav>
      <p className="mt-3 text-xs">Command · Local edition · Ontario, Canada</p>
    </footer>
  );
}
