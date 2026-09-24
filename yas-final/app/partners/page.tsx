import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listContent } from "@/lib/queries/generic";
import type { Partner } from "@/types/database";

export const metadata = { title: "Partners" };

export default async function PartnersPage() {
  const configured = isSupabaseConfigured();
  const partners = configured
    ? (await listContent<Partner>("partners")).filter((p) => p.status === "published")
    : [];

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Partners"
        title="Institutions that stand with YAS."
        subtitle="Firms, chambers, and centres that support the Society's work."
        trail={[{ label: "Partners" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || partners.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published partners yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Partners published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-10 border-y border-hairline py-12">
              {partners.map((partner) => (
                <span
                  key={partner.id}
                  className="font-serif text-[1.3rem] font-normal text-ink-soft/70 transition-colors hover:text-navy-deep"
                >
                  {partner.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
