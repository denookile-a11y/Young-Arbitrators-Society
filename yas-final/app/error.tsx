"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Public-facing error boundary. Deliberately shows NO database or internal
 * error text — a failed Postgres query or RLS rejection must not surface
 * its message to an anonymous visitor. The real error is logged to the
 * server console via the effect below for operators to inspect.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center bg-gradient-to-br from-navy-deep via-[#0d2148] to-navy-mid px-6 text-white md:px-10">
      <div className="mx-auto max-w-[560px]">
        <span className="mb-4 block text-xs font-bold tracking-wide text-gold-soft">Error</span>
        <h1 className="mb-5 font-serif text-[clamp(2rem,4vw,3rem)] font-normal leading-tight">
          Something went wrong.
        </h1>
        <p className="mb-8 text-[1.02rem] leading-relaxed text-white/72">
          We couldn&apos;t load this page. This has been logged and will be
          looked into — please try again, or return to the homepage.
        </p>
        {error.digest && (
          <p className="mb-8 text-xs text-white/40">Reference: {error.digest}</p>
        )}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={reset}
            className="rounded-[2px] bg-gold px-6 py-3.5 text-sm font-bold text-navy-deep transition-colors hover:bg-gold-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-[2px] border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:border-white"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
