import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalDocuments, policyUpdated, type LegalDocument } from '@/lib/legal';
import { LegalFooter } from '@/components/legal-footer';

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  return {
    title: Object.hasOwn(legalDocuments, document)
      ? legalDocuments[document as LegalDocument].title
      : 'Not found',
  };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(legalDocuments, document)) notFound();
  const content = legalDocuments[document as LegalDocument];
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
      <a href="#policy-content" className="skip-link">
        Skip to policy
      </a>
      <header className="mb-10">
        <Link href="/" className="text-lg font-semibold">
          Command
        </Link>
        <p className="muted mt-2 text-sm">Local edition · Policy information</p>
      </header>
      <main id="policy-content" tabIndex={-1} className="policy-content">
        <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="muted mt-3 text-sm">Updated {policyUpdated}</p>
        <p className="mt-6 text-base leading-7">{content.introduction}</p>
        {content.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        {document === 'credits' && (
          <div className="mt-6 space-y-3">
            <p>
              <a className="underline" href="/third-party-notices.txt" download>
                Download third-party licence notices
              </a>
            </p>
            <p>
              <a className="underline" href="/licenses/ical-source.txt" download="ical-source.txt">
                Download the unmodified ical.js source and file index
              </a>
            </p>
          </div>
        )}
        {['privacy', 'about'].includes(document) && (
          <p className="mt-6">
            <Link href="/settings#your-data" className="underline">
              Manage your local data
            </Link>
          </p>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
