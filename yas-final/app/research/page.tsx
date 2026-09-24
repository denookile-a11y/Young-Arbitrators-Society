import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Research } from "@/types/database";

export const metadata = { title: "Research" };

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Research>("research", {
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
        eyebrow="Research & Scholarship"
        title="Research that moves the conversation forward."
        subtitle="Papers, case notes, commentaries, and policy briefs on arbitration and ADR."
        trail={[{ label: "Research" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || items.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published research yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Papers published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-3">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/research/${item.slug}`}
                    className="flex flex-col gap-3 bg-white p-8 hover:bg-off-white"
                  >
                    <span className="text-xs font-extrabold tracking-wide text-gold">
                      {item.category ?? "Research"}
                    </span>
                    <h3 className="font-serif text-[1.25rem] font-normal leading-snug">{item.title}</h3>
                    {item.abstract && (
                      <p className="flex-1 text-sm leading-relaxed text-ink-soft">{item.abstract}</p>
                    )}
                  </Link>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/research" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
