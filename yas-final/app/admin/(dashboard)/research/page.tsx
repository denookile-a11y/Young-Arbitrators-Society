import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { Research } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { Pagination } from "@/components/ui/pagination";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function ResearchListPage({
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
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const items = result.rows;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Research" title="Research Repository" newHref="/admin/research/new" newLabel="New Paper" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No research entries yet" description="Create the first paper, case note, or policy brief." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.title}
                meta={`${item.category ?? "Uncategorized"}${item.featured ? " · Featured" : ""}`}
                status={item.status}
                editHref={`/admin/research/${item.id}`}
                previewHref={`/research/${item.slug}`}
                actions={[
                  item.status !== "published"
                    ? {
                        label: "Publish",
                        formAction: async () => {
                          "use server";
                          await setContentStatus("research", item.id, "published", ["/admin/research", "/research", "/"]);
                        },
                      }
                    : {
                        label: "Archive",
                        formAction: async () => {
                          "use server";
                          await setContentStatus("research", item.id, "archived", ["/admin/research", "/research", "/"]);
                        },
                      },
                  {
                    label: item.featured ? "Unfeature" : "Feature",
                    formAction: async () => {
                      "use server";
                      await toggleFeatured("research", item.id, !item.featured, ["/admin/research", "/research", "/"]);
                    },
                  },
                  {
                    label: "Delete",
                    variant: "danger",
                    formAction: async () => {
                      "use server";
                      await deleteContent("research", item.id, ["/admin/research", "/research", "/"]);
                    },
                  },
                ]}
              />
            ))}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/research" />
      </CmsConnectionGate>
    </div>
  );
}
