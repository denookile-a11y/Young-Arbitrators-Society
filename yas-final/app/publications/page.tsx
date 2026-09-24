import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Publication } from "@/types/database";

export const metadata = { title: "Publications" };

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Publication>("publications", {
        page,
        orderBy: { column: "published_on", ascending: false },
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Newsroom"
        title="News, insights, and announcements."
        subtitle="The editorial voice of the Young Arbitrators Society."
        trail={[{ label: "Publications" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || items.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published articles yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Articles published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <div className="border-t border-hairline">
              {items.map((pub) => (
                <Link
                  key={pub.id}
                  href={`/publications/${pub.slug}`}
                  className="grid grid-cols-[90px_1fr_auto] items-center gap-7 border-b border-hairline py-7 transition-[padding] hover:pl-2.5"
                >
                  <span className="text-xs font-extrabold tracking-wide text-gold">
                    {pub.category?.toUpperCase() ?? "NEWS"}
                  </span>
                  <div>
                    <h3 className="font-serif text-[1.2rem] font-normal">{pub.title}</h3>
                    {pub.published_on && (
                      <span className="text-xs text-ink-soft">
                        {new Date(pub.published_on).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-ink-soft opacity-0 transition-opacity hover:opacity-100">
                    Read →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      {items.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pb-18 md:px-10">
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/publications" />
        </div>
      )}
      <SiteFooter />
    </>
  );
}
