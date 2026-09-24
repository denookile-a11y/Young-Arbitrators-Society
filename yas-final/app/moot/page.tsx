import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Moot } from "@/types/database";

export const metadata = { title: "Moot Court" };

export default async function MootPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Moot>("moots", {
        page,
        orderBy: { column: "year", ascending: false },
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const moots = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Moot Court"
        title="Mooting is where advocacy becomes practice."
        subtitle="Current, upcoming, and past moots — with problems, memorials, authorities, and results."
        trail={[{ label: "Moot" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || moots.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published moots yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Moot competitions published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-3">
                {moots.map((moot) => (
                  <Link
                    key={moot.id}
                    href={`/moot/${moot.slug}`}
                    className="flex flex-col gap-3 bg-white p-8 hover:bg-off-white"
                  >
                    <span className="text-xs font-extrabold tracking-wide text-gold">{moot.year}</span>
                    <h3 className="font-serif text-[1.25rem] font-normal">{moot.title}</h3>
                    {moot.description && (
                      <p className="flex-1 text-sm leading-relaxed text-ink-soft">{moot.description}</p>
                    )}
                  </Link>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/moot" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
