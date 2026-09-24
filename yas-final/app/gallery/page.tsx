import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Gallery } from "@/types/database";

export const metadata = { title: "Gallery" };

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Gallery>("galleries", {
        page,
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const galleries = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Gallery"
        title="Moments from the Society."
        subtitle="Photos and videos from moots, conferences, and CSR initiatives."
        trail={[{ label: "Gallery" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || galleries.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published galleries yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Photo and video collections published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-2 md:grid-cols-3">
                {galleries.map((gallery) => (
                  <Link
                    key={gallery.id}
                    href={`/gallery/${gallery.slug}`}
                    className="flex flex-col gap-2.5 bg-white p-2 hover:bg-off-white"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-navy-mid to-navy-deep" />
                    <h3 className="px-2 pb-2 text-sm font-semibold text-ink">{gallery.title}</h3>
                  </Link>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/gallery" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
