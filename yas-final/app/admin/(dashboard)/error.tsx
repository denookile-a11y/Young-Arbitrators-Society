"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Admin-facing error boundary. Unlike the public one, this DOES surface
 * the error message — an authenticated admin needs to know whether the
 * failure was a missing table, an RLS rejection, or a bad connection in
 * order to act on it. This is only reachable behind the /admin auth gate
 * enforced in proxy.ts, so it isn't exposed to anonymous visitors.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  const looksLikeMissingSchema =
    /relation .* does not exist|does not exist|schema cache/i.test(error.message);
  const looksLikeRls = /row-level security|permission denied|violates/i.test(error.message);

  return (
    <div className="max-w-[640px]">
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Error</span>
      <h1 className="mb-5 font-serif text-3xl font-normal text-navy-deep">
        This page failed to load.
      </h1>

      <div className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-5 py-4">
        <p className="text-sm font-semibold text-red-700">{error.message}</p>
        {error.digest && <p className="mt-1 text-xs text-red-600/70">Reference: {error.digest}</p>}
      </div>

      {looksLikeMissingSchema && (
        <p className="mb-6 rounded-[2px] border border-hairline bg-off-white px-5 py-4 text-sm text-ink-soft">
          This usually means the database migrations haven&apos;t been run yet.
          Apply everything in <code className="text-ink">supabase/migrations/</code>{" "}
          in order (001 → 005), then reload.
        </p>
      )}

      {looksLikeRls && (
        <p className="mb-6 rounded-[2px] border border-hairline bg-off-white px-5 py-4 text-sm text-ink-soft">
          This looks like a Row Level Security rejection — your admin account
          may not have a matching row in the <code className="text-ink">admins</code>{" "}
          table, or its role may not permit this operation. See the bootstrap
          notes in <code className="text-ink">supabase/seed.sql</code>.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="rounded-[2px] bg-navy-deep px-6 py-3 text-sm font-bold text-white hover:bg-navy-mid"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-[2px] border border-hairline px-6 py-3 text-sm font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
