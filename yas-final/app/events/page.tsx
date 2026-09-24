import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Event } from "@/types/database";

export const metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Event>("events", {
        page,
        orderBy: { column: "starts_at", ascending: true },
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const events = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Events"
        title="Upcoming, ongoing, and past events."
        subtitle="Training sessions, workshops, and gatherings hosted by YAS and its departments."
        trail={[{ label: "Events" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || events.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published events yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">Events published through the CMS will appear here.</p>
            </div>
          ) : (
            <>
              <div className="border-t border-hairline">
                {events.map((event) => (
                  <div key={event.id} className="grid grid-cols-[140px_1fr] gap-6 border-b border-hairline py-6">
                    <span className="text-xs font-extrabold tracking-wide text-gold">
                      {new Date(event.starts_at).toLocaleDateString()}
                    </span>
                    <div>
                      <div className="font-serif text-lg">{event.title}</div>
                      {event.venue && <div className="text-xs text-ink-soft">{event.venue}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/events" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
