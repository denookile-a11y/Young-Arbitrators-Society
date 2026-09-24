import Link from "next/link";
import { NotConnectedBanner } from "./not-connected-banner";

export function CmsListHeader({
  eyebrow,
  title,
  newHref,
  newLabel = "New",
}: {
  eyebrow: string;
  title: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="mb-2 block text-xs font-bold tracking-wide text-gold">
          {eyebrow}
        </span>
        <h1 className="font-serif text-3xl font-normal text-navy-deep">{title}</h1>
      </div>
      {newHref && (
        <Link
          href={newHref}
          className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-navy-mid"
        >
          + {newLabel}
        </Link>
      )}
    </div>
  );
}

export function CmsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
      <p className="font-serif text-lg text-navy-deep">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{description}</p>
    </div>
  );
}

/**
 * Wraps a CMS list page's body: shows the not-connected banner when
 * Supabase isn't configured, otherwise renders children. Keeps every list
 * page's "what do I show when there's no DB" logic identical.
 */
export function CmsConnectionGate({
  configured,
  children,
}: {
  configured: boolean;
  children: React.ReactNode;
}) {
  if (!configured) {
    return (
      <>
        <NotConnectedBanner />
        <CmsEmptyState
          title="Waiting for a database connection"
          description="This module is wired to real Supabase queries and will populate once a project is connected — see the README for setup steps."
        />
      </>
    );
  }
  return <>{children}</>;
}
