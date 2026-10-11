"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type NewsletterFormState } from "@/lib/actions/newsletter-signup";

const initialState: NewsletterFormState = {};

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeNewsletterAction, initialState);

  if (state.success) {
    return <p className="text-sm font-semibold text-navy-deep">Subscribed — thank you.</p>;
  }

  return (
    <form action={formAction} className="max-w-[400px] space-y-2">
      <div className="nl-field flex items-stretch rounded-[2px] border border-hairline bg-white transition-colors focus-within:border-navy-deep focus-within:ring-2 focus-within:ring-gold/40">
        <input
          type="email"
          name="email"
          aria-label="Email address"
          autoComplete="email"
          placeholder="Email address"
          required
          disabled={isPending}
          className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="m-1 inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[2px] bg-navy-deep px-5 text-sm font-bold text-white transition-colors hover:bg-gold hover:text-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-deep disabled:opacity-60 disabled:hover:bg-navy-deep disabled:hover:text-white"
        >
          {isPending ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
