import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Moot } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function MootListPage({
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
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Moot" title="Moot Repository" newHref="/admin/moot/new" newLabel="New Moot" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No moots yet" description="Create the first moot competition record." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={`${item.year}${item.winning_team ? " · Won by " + item.winning_team : ""}`}
                status={item.status}
                editHref={`/admin/moot/${item.id}`}
                previewHref={`/moot/${item.slug}`}
                actions={[
                  item.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("moots", item.id, "published", ["/admin/moot", "/moot", "/"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("moots", item.id, "archived", ["/admin/moot", "/moot", "/"]); } },
                  { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("moots", item.id, !item.featured, ["/admin/moot", "/moot", "/"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("moots", item.id, ["/admin/moot", "/moot", "/"]); } },
                ]}
              />
            ))}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/moot" />
      </CmsConnectionGate>
    </div>
  );
}
