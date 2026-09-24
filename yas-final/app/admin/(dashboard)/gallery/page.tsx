import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Gallery } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function GalleryListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<Gallery>("galleries", { page })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const galleries = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Media" title="Galleries" newHref="/admin/gallery/new" newLabel="New Gallery" />
      <CmsConnectionGate configured={configured}>
        {galleries.length === 0 ? (
          <CmsEmptyState title="No galleries yet" description="Create a gallery, then add photos and videos to it." />
        ) : (
          <div className="border-t border-hairline">
            {galleries.map((gallery) => (
              <CmsTableRow
                key={gallery.id}
                title={gallery.title}
                meta={gallery.category ?? undefined}
                status={gallery.status}
                editHref={`/admin/gallery/${gallery.id}`}
                previewHref="/gallery"
                actions={[
                  gallery.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("galleries", gallery.id, "published", ["/admin/gallery", "/gallery"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("galleries", gallery.id, "archived", ["/admin/gallery", "/gallery"]); } },
                  { label: gallery.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("galleries", gallery.id, !gallery.featured, ["/admin/gallery", "/gallery"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("galleries", gallery.id, ["/admin/gallery", "/gallery"]); } },
                ]}
              />
            ))}
          </div>
        )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/gallery" />
      </CmsConnectionGate>
    </div>
  );
}
