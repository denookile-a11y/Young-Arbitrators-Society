import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { VideoHero } from "@/components/hero/video-hero";
import { NewsletterForm } from "@/components/ui/newsletter-form";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getHomepageData } from "@/lib/queries/homepage";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const data = configured
    ? await getHomepageData()
    : { announcements: [], featuredResearch: null, upcomingConference: null, latestPublications: [], partners: [] };

  return (
    <>
      {data.announcements.length > 0 && (
        <div className="group/ticker overflow-hidden whitespace-nowrap border-b border-white/16 bg-navy-deep py-2.5">
          <div className="animate-ticker inline-flex">
            {[...data.announcements, ...data.announcements].map((a, i) => (
              <span
                key={`${a.id}-${i}`}
                className="inline-flex items-center gap-2.5 border-r border-white/16 px-8 text-[0.78rem] font-semibold text-white/80"
              >
                <span className="text-[0.68rem] font-extrabold tracking-wide text-gold-soft">
                  {a.category?.toUpperCase() ?? "NEWS"}
                </span>
                {a.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <SiteNav transparentOnHero />
      <VideoHero />

      {!configured && (
        <section className="border-b border-hairline bg-off-white px-6 py-14 md:px-10">
          <div className="mx-auto max-w-[1240px] rounded-[2px] border border-gold/40 bg-gold/10 px-6 py-5">
            <p className="text-sm font-semibold text-navy-deep">
              Running without a live database
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Featured research, the upcoming conference spotlight, and
              recent publications below are queried live from Supabase.
              Until real project credentials are added to{" "}
              <code className="text-ink">.env.local</code>, those sections
              will show their empty states rather than fabricated content.
            </p>
          </div>
        </section>
      )}

      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
          <div className="border-l-2 border-gold pl-7 font-serif text-[1.7rem] italic font-normal leading-snug text-navy-deep">
            &ldquo;An institution built by students, for the practice of
            arbitration — not as theory, but as craft.&rdquo;
          </div>
          <div className="max-w-[480px] space-y-5 text-[1.03rem] leading-relaxed text-ink-soft">
            <p>
              The Young Arbitrators Society is a student-led institution
              within Kenyatta University School of Law, established to
              cultivate rigorous, practice-ready thinking in arbitration and
              alternative dispute resolution.
            </p>
            <p>
              Through moot advocacy, published research, conferences, and
              community outreach, YAS operates as both a training ground and
              a public voice.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-navy-deep px-6 py-[130px] text-white md:px-10">
        <div className="mx-auto max-w-[920px]">
          <span className="mb-6 block text-[0.78rem] font-bold text-gold-soft">
            Our Philosophy
          </span>
          <h2 className="font-serif text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.22] tracking-tight">
            The future of ADR is written by those{" "}
            <span className="font-normal italic text-gold-soft">
              willing to argue it into being
            </span>{" "}
            — one moot, one memorial, one paper at a time.
          </h2>
        </div>
      </section>

      <section className="border-y border-hairline bg-off-white">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 md:grid-cols-5">
          {[
            ["180+", "Active Members"],
            ["24", "Events Hosted"],
            ["40+", "Research Publications"],
            ["12", "Moot Competitions"],
            ["3", "Institutional Partners"],
          ].map(([num, label], i) => (
            <div
              key={label}
              className={`px-7 py-13 ${i < 4 ? "border-r border-hairline" : ""} border-b border-hairline last:border-b-0 md:border-b-0`}
            >
              <span className="mb-2 block font-serif text-[2.6rem] leading-none text-navy-deep">
                {num}
              </span>
              <span className="text-[0.82rem] font-semibold text-ink-soft">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-[140px] md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-15 flex flex-wrap items-end justify-between gap-10">
            <div>
              <span className="mb-4 block text-[0.78rem] font-bold text-gold">
                Departments
              </span>
              <h2 className="max-w-[640px] font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal leading-tight">
                Seven departments, one institutional mandate.
              </h2>
            </div>
            <Link
              href="/departments"
              className="group inline-flex items-center gap-2 border-b-[1.5px] border-gold pb-1 text-[0.84rem] font-bold text-navy-deep"
            >
              View all departments
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-6">
            <Link
              href="/departments/moot"
              className="flex flex-col justify-between bg-navy-deep p-7 text-white transition-colors hover:bg-navy-mid md:col-span-3 md:row-span-2"
            >
              <span className="text-xs font-bold text-gold-soft">Registration open</span>
              <div>
                <div className="font-serif text-[2rem] font-normal">Moot</div>
                <p className="mt-2 max-w-[280px] text-sm opacity-65">
                  Advocacy training through competitive arbitration moots,
                  from problem drafting to national rounds.
                </p>
              </div>
            </Link>
            {[
              ["Research", "research"],
              ["Conferences", "conferences"],
              ["CSR", "csr"],
              ["Partnerships", "partnerships"],
              ["Media & Comms", "media"],
            ].map(([label, slug]) => (
              <Link
                key={slug}
                href={`/departments/${slug}`}
                className="flex min-h-[200px] flex-col justify-between bg-white p-7 transition-colors hover:bg-off-white md:col-span-3"
              >
                <div className="font-serif text-[1.5rem] font-normal">{label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {data.featuredResearch && (
        <section className="px-6 pb-14 md:px-10">
          <div className="mx-auto max-w-[1240px] grid grid-cols-1 items-center gap-[70px] border-t border-hairline py-20 md:grid-cols-2">
            <div className="aspect-[4/3] bg-gradient-to-br from-navy-mid to-navy-deep" />
            <div>
              <span className="mb-4 block text-xs font-extrabold tracking-wide text-gold">
                Featured Research
              </span>
              <h3 className="mb-4 font-serif text-[1.9rem] font-normal leading-tight tracking-tight">
                {data.featuredResearch.title}
              </h3>
              {data.featuredResearch.abstract && (
                <p className="mb-6 text-[0.98rem] leading-relaxed text-ink-soft">
                  {data.featuredResearch.abstract}
                </p>
              )}
              <Link
                href={`/research/${data.featuredResearch.slug}`}
                className="text-[0.84rem] font-bold text-navy-deep border-b-[1.5px] border-gold pb-1"
              >
                Read the paper →
              </Link>
            </div>
          </div>
        </section>
      )}

      {data.upcomingConference && (
        <section className="bg-off-white px-6 py-18 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
              <div>
                <span className="mb-4 block text-[0.78rem] font-bold text-gold">Upcoming</span>
                <h2 className="font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal leading-tight">
                  {data.upcomingConference.title}
                </h2>
              </div>
              <Link
                href={`/conferences/${data.upcomingConference.slug}`}
                className="text-[0.84rem] font-bold text-navy-deep border-b-[1.5px] border-gold pb-1"
              >
                View conference →
              </Link>
            </div>
          </div>
        </section>
      )}

      {data.latestPublications.length > 0 && (
        <section className="px-6 py-18 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <div className="mb-15 flex flex-wrap items-end justify-between gap-10">
              <div>
                <span className="mb-4 block text-[0.78rem] font-bold text-gold">
                  Latest from YAS
                </span>
                <h2 className="font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal leading-tight">
                  News, publications, and updates.
                </h2>
              </div>
              <Link
                href="/publications"
                className="text-[0.84rem] font-bold text-navy-deep border-b-[1.5px] border-gold pb-1"
              >
                View all publications →
              </Link>
            </div>
            <div className="border-t border-hairline">
              {data.latestPublications.map((pub) => (
                <Link
                  key={pub.id}
                  href={`/publications/${pub.slug}`}
                  className="grid grid-cols-[90px_1fr_auto] items-center gap-7 border-b border-hairline py-7 hover:pl-2.5 transition-[padding]"
                >
                  <span className="text-xs font-extrabold tracking-wide text-gold">
                    {pub.category?.toUpperCase() ?? "NEWS"}
                  </span>
                  <div>
                    <h3 className="font-serif text-[1.2rem] font-normal">{pub.title}</h3>
                  </div>
                  <span className="text-sm font-bold text-ink-soft opacity-0 transition-opacity hover:opacity-100">
                    Read →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.partners.length > 0 && (
        <section className="px-6 py-14 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-6 block text-[0.78rem] font-bold text-gold">Partners</span>
            <div className="flex flex-wrap items-center justify-between gap-10 border-y border-hairline py-12">
              {data.partners.map((p) => (
                <span key={p.id} className="font-serif text-[1.3rem] font-normal text-ink-soft/55 hover:text-navy-deep transition-colors">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="bg-off-white px-8 py-20 md:px-14">
          <span className="mb-4 block text-xs font-bold text-gold">Newsletter</span>
          <h3 className="mb-5 max-w-[380px] font-serif text-[1.9rem] font-normal leading-tight">
            Stay informed on YAS activity.
          </h3>
          <p className="mb-8 max-w-[380px] text-sm leading-relaxed text-ink-soft/90">
            Moot announcements, research releases, and conference updates.
          </p>
          <NewsletterForm />
        </div>
        <div className="bg-navy-deep px-8 py-20 text-white md:px-14">
          <span className="mb-4 block text-xs font-bold text-gold-soft">Get Involved</span>
          <h3 className="mb-5 max-w-[380px] font-serif text-[1.9rem] font-normal leading-tight">
            Join YAS or partner with us.
          </h3>
          <p className="mb-8 max-w-[380px] text-sm leading-relaxed text-white/75">
            Whether as a member, sponsor, or institutional partner — there is a place for you.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link href="/join" className="rounded-[2px] bg-gold px-6 py-3.5 text-sm font-bold text-navy-deep hover:bg-gold-soft">
              Join YAS
            </Link>
            <Link href="/partners" className="rounded-[2px] border border-white/35 px-6 py-3.5 text-sm font-bold text-white hover:border-white">
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
