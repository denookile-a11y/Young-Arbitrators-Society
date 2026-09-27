import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Publication } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { canWriteScopedRow } from "@/lib/auth/department-scope";

export default async function PublicationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [result, admin] = await Promise.all([
    configured
      ? listPaginated<Publication>("publications", {
          page,
          orderBy: { column: "published_on", ascending: false },
        })
      : Promise.resolve({ rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 }),
    configured ? getCurrentAdmin() : Promise.resolve(null),
  ]);
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Publications" title="Publications" newHref="/admin/publications/new" newLabel="New Publication" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No publications yet" description="Create the first news item, insight, or announcement article." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => {
              // A department_admin sees every publication (RLS's own read
              // policy is unscoped for admins), but can only write ones in
              // their own department — withhold the write actions on rows
              // they can't touch instead of showing a button that will
              // only ever come back rejected.
              const canWrite = !admin || canWriteScopedRow(admin, item.department_id);
              return (
                <CmsTableRow
                  key={item.id}
                  title={item.title}
                  meta={item.category ?? undefined}
                  status={item.status}
                  editHref={`/admin/publications/${item.id}`}
                  previewHref={`/publications/${item.slug}`}
                  actions={
                    canWrite
                      ? [
                          item.status !== "published"
                            ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("publications", item.id, "published", ["/admin/publications", "/publications", "/"]); } }
                            : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("publications", item.id, "archived", ["/admin/publications", "/publications", "/"]); } },
                          { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("publications", item.id, !item.featured, ["/admin/publications", "/publications", "/"]); } },
                          { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("publications", item.id, ["/admin/publications", "/publications", "/"]); } },
                        ]
                      : []
                  }
                />
              );
            })}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/publications" />
      </CmsConnectionGate>
    </div>
  );
}
