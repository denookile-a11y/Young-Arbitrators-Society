import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { setContentStatus, deleteContent } from "@/lib/actions/content-status";

export default async function DepartmentsListPage() {
  const configured = isSupabaseConfigured();
  const [allDepartments, admin] = await Promise.all([
    configured ? listDepartments() : Promise.resolve([]),
    configured ? getCurrentAdmin() : Promise.resolve(null),
  ]);

  const isDepartmentAdmin = admin?.role === "department_admin";
  // department_admin only manages their own department — RLS agrees (see
  // "department_admin manages own department", update-only, no
  // insert/delete). Scoping the list itself, not just the row actions,
  // means they never see a Delete/Publish button on a row they can't
  // touch in the first place.
  const departments = isDepartmentAdmin
    ? allDepartments.filter((d) => d.id === admin!.department_id)
    : allDepartments;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader
        eyebrow="Structure"
        title="Departments"
        newHref={isDepartmentAdmin ? undefined : "/admin/departments/new"}
        newLabel="New Department"
      />
      <CmsConnectionGate configured={configured}>
        {departments.length === 0 ? (
          <CmsEmptyState
            title={isDepartmentAdmin ? "Your department isn't set up yet" : "No departments yet"}
            description={
              isDepartmentAdmin
                ? "Ask a super admin to assign your account to a department."
                : "Create the six standing departments (Moot, Research, CSR, Conferences, Partnerships, Media) or add a new one."
            }
          />
        ) : (
          <div className="border-t border-hairline">
            {departments.map((dept) => (
              <CmsTableRow
                key={dept.id}
                title={dept.name}
                meta={dept.tagline ?? undefined}
                status={dept.status}
                editHref={`/admin/departments/${dept.id}`}
                previewHref={`/departments/${dept.slug}`}
                actions={[
                  dept.status !== "published"
                    ? {
                        label: "Publish",
                        formAction: async () => {
                          "use server";
                          await setContentStatus("departments", dept.id, "published", [
                            "/admin/departments",
                            "/departments",
                          ]);
                        },
                      }
                    : {
                        label: "Archive",
                        formAction: async () => {
                          "use server";
                          await setContentStatus("departments", dept.id, "archived", [
                            "/admin/departments",
                            "/departments",
                          ]);
                        },
                      },
                  // Deletion is admin+ only — departments has no delete
                  // policy for department_admin at all — so the button
                  // itself is withheld here rather than shown and then
                  // rejected on click.
                  ...(isDepartmentAdmin
                    ? []
                    : [
                        {
                          label: "Delete",
                          variant: "danger" as const,
                          formAction: async () => {
                            "use server";
                            await deleteContent("departments", dept.id, [
                              "/admin/departments",
                              "/departments",
                            ]);
                          },
                        },
                      ]),
                ]}
              />
            ))}
          </div>
        )}
      </CmsConnectionGate>
    </div>
  );
}
