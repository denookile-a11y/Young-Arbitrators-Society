import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Who We Are"
        title="An institution built by students, for the practice of arbitration."
        subtitle="The story, philosophy, and impact of the Young Arbitrators Society at Kenyatta University School of Law."
        trail={[{ label: "About" }]}
      />

      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
          <div className="border-l-2 border-gold pl-7 font-serif text-[1.4rem] italic font-normal leading-snug text-navy-deep">
            &ldquo;We do not teach arbitration as theory. We practice it as
            craft.&rdquo;
          </div>
          <div className="max-w-[480px] space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">
            <p>
              Founded within Kenyatta University School of Law, the Young
              Arbitrators Society exists to cultivate rigorous,
              practice-ready thinking in arbitration and alternative dispute
              resolution among law students.
            </p>
            <p>
              What began as a small moot preparation group has grown into a
              full institutional presence — spanning research publication,
              conference convening, community legal outreach, and a
              structured leadership pipeline that carries institutional
              memory from one administration to the next.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-off-white px-6 py-14 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <span className="mb-4 block text-xs font-bold text-gold">Our Story</span>
          <h2 className="mb-12 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal">
            Development timeline
          </h2>
          <div className="border-t border-hairline">
            {[
              ["2023/24", "Founding cohort establishes YAS as a registered student society", "Inaugural moot preparation group formalised under KU School of Law"],
              ["2024/25", "Research and CSR departments established", "First published research journal; Elimu Legal Aid Clinic partnership begins"],
              ["2025/26", "Current administration inaugurated; conference programme launched", "First YAS Annual ADR Conference convened"],
            ].map(([year, title, meta]) => (
              <div key={year} className="grid grid-cols-[120px_1fr] gap-6 border-b border-hairline py-6">
                <span className="text-xs font-extrabold tracking-wide text-gold">{year}</span>
                <div>
                  <div className="text-sm font-semibold text-ink">{title}</div>
                  <div className="text-xs text-ink-soft">{meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <span className="mb-4 block text-xs font-bold text-gold">Vision, Mission &amp; Values</span>
          <h2 className="mb-12 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal">
            What guides the Society.
          </h2>
          <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-3">
            {[
              ["Vision", "A Kenyan legal culture fluent in arbitration", "To be the leading student institution shaping how the next generation of Kenyan lawyers understands and practices dispute resolution."],
              ["Mission", "Train, publish, and convene", "To equip students with practical advocacy skill, produce rigorous scholarship, and create spaces where practitioners and students meet."],
              ["Values", "Rigour, integrity, service", "Every moot problem, paper, and partnership is held to the standard of real practice, not classroom exercise."],
            ].map(([tag, title, desc]) => (
              <div key={tag} className="flex flex-col gap-3.5 bg-white p-8">
                <span className="text-xs font-extrabold tracking-wide text-gold">{tag}</span>
                <h3 className="font-serif text-[1.25rem] font-normal leading-snug">{title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-y border-hairline bg-off-white">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 md:grid-cols-5">
          {[
            ["180+", "Members"],
            ["3", "Years of Activity"],
            ["12", "Moots"],
            ["40+", "Research Publications"],
            ["3", "Partnerships"],
          ].map(([num, label], i) => (
            <div key={label} className={`px-7 py-13 ${i < 4 ? "border-r border-hairline" : ""} border-b border-hairline md:border-b-0`}>
              <span className="mb-2 block font-serif text-[2.6rem] leading-none text-navy-deep">{num}</span>
              <span className="text-[0.82rem] font-semibold text-ink-soft">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
