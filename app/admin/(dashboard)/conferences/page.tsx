import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Conference } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function ConferencesListPage({
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
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Conferences" title="Conferences" newHref="/admin/conferences/new" newLabel="New Conference" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No conferences yet" description="Create the first conference." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={`${new Date(item.starts_at).toLocaleDateString()}${item.venue ? " · " + item.venue : ""}`}
                status={item.status}
                editHref={`/admin/conferences/${item.id}`}
                previewHref={`/conferences/${item.slug}`}
                actions={[
                  item.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("conferences", item.id, "published", ["/admin/conferences", "/conferences", "/"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("conferences", item.id, "archived", ["/admin/conferences", "/conferences", "/"]); } },
                  { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("conferences", item.id, !item.featured, ["/admin/conferences", "/conferences", "/"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("conferences", item.id, ["/admin/conferences", "/conferences", "/"]); } },
                ]}
              />
            ))}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/conferences" />
      </CmsConnectionGate>
    </div>
  );
}
