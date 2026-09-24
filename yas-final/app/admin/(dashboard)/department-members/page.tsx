import Link from "next/link";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listEditions, getCurrentEdition } from "@/lib/queries/leadership";
import { listDepartmentMembersForEdition } from "@/lib/queries/department-members";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { Toast } from "@/components/admin/toast";
import { deleteDepartmentMemberAction } from "@/lib/actions/department-members";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { canWriteScopedRow } from "@/lib/auth/department-scope";

export default async function DepartmentMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ edition?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { edition: editionParam } = await searchParams;

  const editions = configured ? await listEditions() : [];
  const currentEdition = configured ? await getCurrentEdition() : null;
  const activeEdition = editionParam
    ? editions.find((e) => e.id === editionParam)
    : (currentEdition ?? editions[0]);

  const [allMembers, admin] = await Promise.all([
    configured && activeEdition ? listDepartmentMembersForEdition(activeEdition.id) : Promise.resolve([]),
    configured ? getCurrentAdmin() : Promise.resolve(null),
  ]);

  const isDepartmentAdmin = admin?.role === "department_admin";
  // department_admin only manages their own department's roster — scope
  // the list itself, same pattern as the Departments list page, so they
  // never see a Delete button on a member they can't remove.
  const members = isDepartmentAdmin
    ? allMembers.filter((m) => m.department_id === admin!.department_id)
    : allMembers;

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader
        eyebrow="Departments"
        title="Department Members"
        newHref="/admin/department-members/new"
        newLabel="Add Member"
      />

      <CmsConnectionGate configured={configured}>
        {editions.length === 0 ? (
          <CmsEmptyState
            title="No editions yet"
            description="Create an edition before adding department members — every membership belongs to a specific administration."
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap gap-2 border-b border-hairline pb-6">
              {editions.map((ed) => (
                <Link
                  key={ed.id}
                  href={`/admin/department-members?edition=${ed.id}`}
                  className={`rounded-[2px] border px-4 py-2 text-xs font-semibold ${
                    activeEdition?.id === ed.id
                      ? "border-navy-deep bg-navy-deep text-white"
                      : "border-hairline text-ink-soft hover:border-navy-deep hover:text-navy-deep"
                  }`}
                >
                  {ed.label}
                  {ed.is_current && " · Current"}
                </Link>
              ))}
            </div>

            {members.length === 0 ? (
              <CmsEmptyState
                title={`No members for ${activeEdition?.label ?? "this edition"}`}
                description={
                  isDepartmentAdmin
                    ? "Add someone to your department's roster for this edition."
                    : "Add someone to a department's roster for this edition."
                }
              />
            ) : (
              <div className="border-t border-hairline">
                {members.map((m) => {
                  const canWrite = !admin || canWriteScopedRow(admin, m.department_id);
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-hairline py-5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {m.profile?.full_name ?? "(unassigned)"}
                          {m.title ? ` — ${m.title}` : ""}
                        </div>
                        <div className="text-xs text-ink-soft">{m.department?.name ?? "No department"}</div>
                      </div>
                      {canWrite && (
                        <div className="flex shrink-0 items-center gap-4">
                          <Link
                            href={`/admin/department-members/${m.id}`}
                            className="text-xs font-semibold text-navy-deep hover:underline"
                          >
                            Edit
                          </Link>
                          <form
                            action={async () => {
                              "use server";
                              await deleteDepartmentMemberAction(m.id);
                            }}
                          >
                            <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                              Remove
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CmsConnectionGate>
    </div>
  );
}
