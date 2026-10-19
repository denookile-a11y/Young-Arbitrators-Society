import { Suspense } from "react";
import Image from "next/image";
import { ADMIN_WALLPAPERS } from "@/lib/wallpapers";
import { LoginForm } from "@/components/admin/login-form";
import { YasSeal } from "@/components/hero/yas-seal";

/**
 * Server Component wrapper. The form itself needs useSearchParams() (to
 * read redirectTo) and useActionState(), which requires "use client" —
 * but a Client Component calling useSearchParams() must be wrapped in
 * Suspense or Next.js can't statically generate the page at build time.
 *
 * Presentation only: the background is the still atmosphere used across the
 * public site (no video is loaded here). Authentication is unchanged and is
 * enforced server-side by proxy.ts and Row Level Security.
 */
const ADMIN_WALLPAPER_FOCUS = ADMIN_WALLPAPERS.login.focus;

export default function AdminLoginPage() {
  return (
    <section className="atmosphere flex min-h-dvh items-center justify-center px-4 py-12 text-white sm:px-6">
      {/* Decorative background. z-index -1 puts it above the atmosphere photograph
          (::before, -2) and BELOW the atmosphere's own overlay gradient (::after),
          so the original treatment still sits on top and the photograph is the
          fallback if this image fails. */}
      <Image
        src={ADMIN_WALLPAPERS.login.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="z-[-1] object-cover brightness-150"
        style={{ objectPosition: ADMIN_WALLPAPER_FOCUS }}
      />
      <div className="crystal relative w-full max-w-[420px] px-6 pb-8 pt-9 sm:px-9 sm:pt-10" data-lens="navy">
        <div className="flex flex-col items-center text-center">
          <YasSeal className="w-[68px]" rings={false} priority />
          <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-gold-soft">
            Administration
          </p>
          <h1 className="mt-3 font-serif text-[1.75rem] font-normal leading-tight">
            Young Arbitrators Society
          </h1>
          <p className="mt-1.5 text-[0.82rem] text-white/70">
            Kenyatta University School of Law
          </p>
        </div>

        <div aria-hidden className="my-7 h-px w-full bg-gradient-to-r from-transparent via-gold-soft/60 to-transparent" />

        <Suspense fallback={<div className="h-[220px]" aria-hidden="true" />}>
          <LoginForm />
        </Suspense>

        <div aria-hidden className="mb-5 mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <p className="text-center text-[0.72rem] tracking-wide text-white/55">
          Secure institutional administration
        </p>
      </div>
    </section>
  );
}
