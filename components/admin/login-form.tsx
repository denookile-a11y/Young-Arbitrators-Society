"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginActionState } from "@/lib/auth/actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white/70">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.org"
          className="min-h-12 w-full rounded-md border border-white/25 bg-white/[0.06] px-3.5 text-base text-white placeholder:text-white/40 outline-none transition-colors focus:border-gold-soft focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-gold-soft/60 disabled:opacity-60 sm:text-sm"
          disabled={isPending}
        />
        {state.fieldErrors?.email && (
          <p className="mt-2 text-xs text-red-300">{state.fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white/70">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="min-h-12 w-full rounded-md border border-white/25 bg-white/[0.06] px-3.5 text-base text-white placeholder:text-white/40 outline-none transition-colors focus:border-gold-soft focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-gold-soft/60 disabled:opacity-60 sm:text-sm"
          disabled={isPending}
        />
        {state.fieldErrors?.password && (
          <p className="mt-2 text-xs text-red-300">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-burgundy [--btn-radius:6px] min-h-12 w-full px-7 py-3.5 text-sm"
      >
        {isPending ? "Signing in…" : "Sign In"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
