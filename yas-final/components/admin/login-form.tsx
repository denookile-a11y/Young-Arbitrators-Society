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
      <div className="border-b border-white/30 pb-3">
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Email"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
          disabled={isPending}
        />
        {state.fieldErrors?.email && (
          <p className="mt-2 text-xs text-red-300">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="border-b border-white/30 pb-3">
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
          disabled={isPending}
        />
        {state.fieldErrors?.password && (
          <p className="mt-2 text-xs text-red-300">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && (
        <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-[2px] bg-gold px-7 py-4 text-sm font-bold text-navy-deep transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign In"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
