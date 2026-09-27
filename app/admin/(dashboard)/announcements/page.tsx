import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Announcement } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function AnnouncementsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Announcement>("announcements", { page })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Announcements" title="Announcements" newHref="/admin/announcements/new" newLabel="New Announcement" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No announcements yet" description="Create the first ticker announcement." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={`${item.category ?? "General"}${item.expires_at ? " · Expires " + new Date(item.expires_at).toLocaleDateString() : ""}`}
                status={item.status}
                editHref={`/admin/announcements/${item.id}`}
                actions={[
                  item.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("announcements", item.id, "published", ["/admin/announcements", "/"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("announcements", item.id, "archived", ["/admin/announcements", "/"]); } },
                  { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("announcements", item.id, !item.featured, ["/admin/announcements", "/"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("announcements", item.id, ["/admin/announcements", "/"]); } },
                ]}
              />
            ))}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/announcements" />
      </CmsConnectionGate>
    </div>
  );
}
