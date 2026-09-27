import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <section className="flex min-h-[70vh] items-center bg-gradient-to-br from-navy-deep via-[#0d2148] to-navy-mid px-6 py-24 text-white md:px-10">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="mb-4 block text-xs font-bold tracking-wide text-gold-soft">404</span>
          <h1 className="mb-5 max-w-[720px] font-serif text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-tight">
            This page hasn&apos;t been argued yet.
          </h1>
          <p className="mb-9 max-w-[480px] text-[1.02rem] leading-relaxed text-white/72">
            The page you&apos;re looking for doesn&apos;t exist, or may have
            moved. Try the navigation above, or return to the homepage.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[2px] bg-gold px-[26px] py-[15px] text-[0.84rem] font-bold text-navy-deep transition-colors hover:bg-gold-soft"
          >
            Return Home →
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
