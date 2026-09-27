import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listEditions } from "@/lib/queries/leadership";

export const metadata = { title: "Archive" };

export default async function ArchivePage() {
  const configured = isSupabaseConfigured();
  const editions = configured ? await listEditions() : [];
  const pastEditions = editions.filter((e) => !e.is_current);

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Institutional Memory"
        title="Past Administrations."
        subtitle="Leadership records are archived, never deleted."
        trail={[{ label: "Archive" }]}
        image={{
          src: "/img/wallpaper-ku-gate.jpg",
          alt: "The main entrance gate of Kenyatta University",
          focus: "center 45%",
        }}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || pastEditions.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No past editions yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Once an edition is superseded, it will appear here with its leadership record intact.
              </p>
            </div>
          ) : (
            <div className="border-t border-hairline">
              {pastEditions.map((edition) => (
                <Link
                  key={edition.id}
                  href={`/leadership?edition=${edition.id}`}
                  className="flex flex-col gap-1.5 border-b border-hairline py-5 transition-[padding] hover:pl-2 sm:grid sm:grid-cols-[120px_1fr] sm:gap-6 sm:py-6"
                >
                  <span className="text-xs font-extrabold tracking-wide text-gold-on-light">{edition.label}</span>
                  <div className="min-w-0">
                    <div className="font-serif text-lg leading-snug">{edition.label} Administration</div>
                    <div className="text-xs text-ink-soft">
                      Started {new Date(edition.starts_on).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
