import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listContent } from "@/lib/queries/generic";
import type { Partner } from "@/types/database";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { setContentStatus, toggleFeatured, deleteContent } from "@/lib/actions/content-status";

export default async function PartnersListPage() {
  const configured = isSupabaseConfigured();
  const items = configured ? await listContent<Partner>("partners") : [];

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader eyebrow="Partners" title="Partners" newHref="/admin/partners/new" newLabel="New Partner" />
      <CmsConnectionGate configured={configured}>
        {items.length === 0 ? (
          <CmsEmptyState title="No partners yet" description="Add the Society's institutional partners and sponsors." />
        ) : (
          <div className="border-t border-hairline">
            {items.map((item) => (
              <CmsTableRow
                key={item.id}
                title={item.name}
                meta={item.tier ?? undefined}
                status={item.status}
                editHref={`/admin/partners/${item.id}`}
                previewHref="/partners"
                actions={[
                  item.status !== "published"
                    ? { label: "Publish", formAction: async () => { "use server"; await setContentStatus("partners", item.id, "published", ["/admin/partners", "/partners", "/"]); } }
                    : { label: "Archive", formAction: async () => { "use server"; await setContentStatus("partners", item.id, "archived", ["/admin/partners", "/partners", "/"]); } },
                  { label: item.featured ? "Unfeature" : "Feature", formAction: async () => { "use server"; await toggleFeatured("partners", item.id, !item.featured, ["/admin/partners", "/partners", "/"]); } },
                  { label: "Delete", variant: "danger", formAction: async () => { "use server"; await deleteContent("partners", item.id, ["/admin/partners", "/partners", "/"]); } },
                ]}
              />
            ))}
          </div>
        )}
      </CmsConnectionGate>
    </div>
  );
}
