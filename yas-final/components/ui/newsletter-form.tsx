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
      <div className="flex items-center gap-0 border-b-[1.5px] border-hairline pb-3.5">
        <input
          type="email"
          name="email"
          placeholder="Your email address"
          required
          disabled={isPending}
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm font-bold text-gold disabled:opacity-60"
        >
          {isPending ? "…" : "Subscribe"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
