import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { CsrProject } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";
import { canManageCsrProjects } from "@/lib/actions/csr";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function CsrListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [result, admin] = await Promise.all([
    configured
      ? listPaginated<CsrProject>("csr_projects", { page })
      : Promise.resolve({ rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 }),
    configured ? getCurrentAdmin() : Promise.resolve(null),
  ]);
  const items = result.rows;
  // CSR access is all-or-nothing per admin (no per-project department_id
  // to check against) — editor+ always true; a department_admin only if
  // their own department's slug is "csr".
  const canManage = admin ? await canManageCsrProjects(admin) : false;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader
        eyebrow="CSR"
        title="CSR Projects"
        newHref={canManage ? "/admin/csr/new" : undefined}
        newLabel="New Project"
      />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No CSR projects yet" description="Create the first community outreach project." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={item.location ?? undefined}
                status={item.status}
                editHref={`/admin/csr/${item.id}`}
                previewHref="/csr"
                actions={
                  canManage
                    ? [
                        item.status !== "published"
                          ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("csr_projects", item.id, "published", ["/admin/csr", "/csr", "/"]); } }
                          : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("csr_projects", item.id, "archived", ["/admin/csr", "/csr", "/"]); } },
                        { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("csr_projects", item.id, !item.featured, ["/admin/csr", "/csr", "/"]); } },
                        { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("csr_projects", item.id, ["/admin/csr", "/csr", "/"]); } },
                      ]
                    : []
                }
              />
            ))}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/csr" />
      </CmsConnectionGate>
    </div>
  );
}
