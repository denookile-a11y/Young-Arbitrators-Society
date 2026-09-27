import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Event } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function EventsListPage({
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
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Events" title="Events" newHref="/admin/events/new" newLabel="New Event" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No events yet" description="Create the first event." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={`${new Date(item.starts_at).toLocaleString()}${item.venue ? " · " + item.venue : ""}`}
                status={item.status}
                editHref={`/admin/events/${item.id}`}
                previewHref={`/events/${item.slug}`}
                actions={[
                  item.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("events", item.id, "published", ["/admin/events", "/events", "/"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("events", item.id, "archived", ["/admin/events", "/events", "/"]); } },
                  { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("events", item.id, !item.featured, ["/admin/events", "/events", "/"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("events", item.id, ["/admin/events", "/events", "/"]); } },
                ]}
              />
            ))}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/events" />
      </CmsConnectionGate>
    </div>
  );
}
