import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

/**
 * Server Component wrapper. The form itself needs useSearchParams() (to
 * read redirectTo) and useActionState(), which requires "use client" —
 * but a Client Component calling useSearchParams() must be wrapped in
 * Suspense or Next.js can't statically generate the page at build time.
 */
export default function AdminLoginPage() {
  return (
    <section className="relative flex min-h-[calc(100vh-0px)] items-center overflow-hidden bg-gradient-to-br from-navy-deep via-[#0d2148] to-navy-mid px-6 py-24 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(184,145,47,0.08) 0%, transparent 45%)",
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[420px]">
        <span className="mb-4 block text-xs font-bold tracking-wide text-gold-soft">
          Admin
        </span>
        <h1 className="mb-8 font-serif text-3xl font-normal">Sign in to the CMS</h1>

        <Suspense fallback={<div className="h-[220px]" aria-hidden="true" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-xs text-white/50">
          Authenticated via Supabase Auth. Sessions are enforced server-side by{" "}
          <code className="text-white/70">proxy.ts</code> and Row Level Security —
          not by hiding this page in the navigation.
        </p>
      </div>
    </section>
  );
}
