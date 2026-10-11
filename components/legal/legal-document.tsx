import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export const CONTACT_EMAIL = "info@yas-ku.org";

export function ContactLine() {
  return (
    <>
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-deep underline decoration-gold underline-offset-4">
        {CONTACT_EMAIL}
      </a>{" "}
      or through the{" "}
      <Link href="/contact" className="font-semibold text-navy-deep underline decoration-gold underline-offset-4">
        YAS contact form
      </Link>
    </>
  );
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="my-6 rounded-[3px] border border-gold/40 bg-ivory px-5 py-5 sm:px-6">
      <p className="mb-2 font-serif text-lg text-navy-deep">{title}</p>
      <div className="space-y-3 text-[0.95rem] leading-relaxed text-ink-soft">{children}</div>
    </aside>
  );
}

function Toc({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="space-y-2 text-sm text-ink-soft">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-2 transition-colors hover:text-navy-deep">
            <span className="w-6 shrink-0 text-gold-on-light">{i + 1}.</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalDocument({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  trailLabel,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  trailLabel: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        trail={[{ label: trailLabel }]}
      />
      <main className="px-6 py-14 md:px-10 md:py-18">
        <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={`${trailLabel} contents`} className="lg:sticky lg:top-28 lg:self-start">
            <details className="rounded-[3px] border border-hairline bg-off-white px-4 py-3 lg:hidden">
              <summary className="cursor-pointer text-xs font-extrabold tracking-wide text-navy-deep">
                Contents
              </summary>
              <div className="mt-3"><Toc sections={sections} /></div>
            </details>
            <div className="hidden lg:block">
              <p className="mb-4 text-xs font-extrabold tracking-wide text-navy-deep">Contents</p>
              <Toc sections={sections} />
            </div>
          </nav>

          <article className="min-w-0 max-w-[720px]">
            <p className="mb-8 text-xs font-bold tracking-wide text-gold-on-light">
              Last updated: {lastUpdated}
            </p>
            {intro && <div className="mb-10 space-y-4 text-[1.02rem] leading-[1.8] text-ink-soft">{intro}</div>}
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 border-t border-hairline py-9 first:border-t-0">
                <h2 className="mb-4 flex gap-3 font-serif text-[1.55rem] font-normal leading-snug text-navy-deep">
                  <span className="text-gold-on-light">{i + 1}.</span>
                  <span className="min-w-0 break-words">{s.title}</span>
                </h2>
                <div className="space-y-4 break-words text-[1rem] leading-[1.8] text-ink-soft [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                  {s.body}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
