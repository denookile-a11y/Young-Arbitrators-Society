import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Conference } from "@/types/database";

export const metadata = { title: "Conferences" };

export default async function ConferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Conference>("conferences", {
        page,
        orderBy: { column: "starts_at", ascending: true },
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const conferences = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Conferences"
        title="A premium conference environment."
        subtitle="YAS convenes practitioners, scholars, and institutions to examine the state of arbitration."
        trail={[{ label: "Conferences" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || conferences.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published conferences yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Conferences published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-2">
                {conferences.map((conf) => (
                  <Link
                    key={conf.id}
                    href={`/conferences/${conf.slug}`}
                    className="flex flex-col gap-3 bg-white p-8 hover:bg-off-white"
                  >
                    <span className="text-xs font-extrabold tracking-wide text-gold">
                      {new Date(conf.starts_at).toLocaleDateString()}
                      {conf.venue ? ` · ${conf.venue}` : ""}
                    </span>
                    <h3 className="font-serif text-[1.4rem] font-normal leading-snug">{conf.title}</h3>
                    {conf.description && (
                      <p className="flex-1 text-sm leading-relaxed text-ink-soft">{conf.description}</p>
                    )}
                  </Link>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/conferences" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
