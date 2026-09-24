import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { searchPublicContent } from "@/lib/queries/search";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const results =
    configured && query ? await searchPublicContent(query) : { groups: [], totalHits: 0 };

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Search"
        title="Search across YAS."
        subtitle="Research, publications, events, conferences, moots, people and departments."
        trail={[{ label: "Search" }]}
      />

      <section className="px-6 py-14 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <form method="GET" action="/search" className="mb-12 max-w-[560px]">
            <div className="flex items-center gap-3 border-b-[1.5px] border-hairline pb-3">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search YAS…"
                aria-label="Search"
                className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft"
              />
              <button
                type="submit"
                className="rounded-[2px] bg-navy-deep px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-mid"
              >
                Search
              </button>
            </div>
          </form>

          {!configured && (
            <div className="max-w-[560px] rounded-[2px] border border-gold/40 bg-gold/10 px-6 py-5">
              <p className="text-sm font-semibold text-navy-deep">
                Search needs a database connection
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Search queries the published content tables directly — connect
                Supabase and publish content for results to appear here.
              </p>
            </div>
          )}

          {configured && !query && (
            <p className="text-sm text-ink-soft">
              Enter a search term above to look across published YAS content.
            </p>
          )}

          {configured && query && results.totalHits === 0 && (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Try a different term, or browse the sections directly from the
                navigation above.
              </p>
            </div>
          )}

          {configured && query && results.totalHits > 0 && (
            <>
              <p className="mb-10 text-sm text-ink-soft">
                {results.totalHits} result{results.totalHits === 1 ? "" : "s"} for{" "}
                <span className="font-semibold text-ink">&ldquo;{query}&rdquo;</span>
              </p>

              <div className="space-y-12">
                {results.groups.map((group) => (
                  <div key={group.label}>
                    <span className="mb-4 block text-xs font-bold tracking-wide text-gold">
                      {group.label} ({group.hits.length})
                    </span>
                    <div className="border-t border-hairline">
                      {group.hits.map((hit) => (
                        <Link
                          key={hit.id}
                          href={hit.href}
                          className="flex items-center justify-between gap-6 border-b border-hairline py-4 transition-[padding] hover:pl-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-ink">
                              {hit.title}
                            </div>
                            {hit.meta && (
                              <div className="truncate text-xs text-ink-soft">{hit.meta}</div>
                            )}
                          </div>
                          <span className="shrink-0 text-xs font-bold text-ink-soft">View →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
