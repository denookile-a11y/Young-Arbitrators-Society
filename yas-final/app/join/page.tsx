"use client";

import { useActionState } from "react";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { submitJoinFormAction, type JoinFormState } from "@/lib/actions/join";

const initialState: JoinFormState = {};

export default function JoinPage() {
  const [state, formAction, isPending] = useActionState(submitJoinFormAction, initialState);

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Membership"
        title="Join the Society."
        subtitle="Open to law students at Kenyatta University with an interest in arbitration and ADR."
        trail={[{ label: "Join YAS" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[560px]">
          {state.success ? (
            <div className="rounded-[2px] border border-navy-deep/20 bg-off-white px-6 py-8">
              <p className="font-serif text-xl text-navy-deep">Application received.</p>
              <p className="mt-2 text-sm text-ink-soft">
                Thank you for your interest in YAS — a member of the committee will follow up by email.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-6">
              <div className="border-b border-hairline pb-3">
                <label htmlFor="full_name" className="sr-only">Full name</label>
                <input
                  id="full_name"
                  name="full_name"
                  placeholder="Full name"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
                {state.fieldErrors?.full_name && (
                  <p className="mt-2 text-xs text-red-600">{state.fieldErrors.full_name}</p>
                )}
              </div>
              <div className="border-b border-hairline pb-3">
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
                {state.fieldErrors?.email && (
                  <p className="mt-2 text-xs text-red-600">{state.fieldErrors.email}</p>
                )}
              </div>
              <div className="border-b border-hairline pb-3">
                <label htmlFor="year_of_study" className="sr-only">Year of study</label>
                <input
                  id="year_of_study"
                  name="year_of_study"
                  placeholder="Year of study"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
              </div>

              {state.error && (
                <p className="rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-navy-mid disabled:opacity-60"
              >
                {isPending ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
