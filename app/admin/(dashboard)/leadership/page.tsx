import Link from "next/link";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  listEditions,
  getCurrentEdition,
  listLeadershipRolesForEdition,
} from "@/lib/queries/leadership";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { deleteLeadershipRoleAction, setCurrentEditionAction } from "@/lib/actions/leadership";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { canWriteScopedRow } from "@/lib/auth/department-scope";

export default async function LeadershipPage({
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
    : currentEdition ?? editions[0];

  const roles = configured && activeEdition
    ? await listLeadershipRolesForEdition(activeEdition.id)
    : [];
  const admin = configured ? await getCurrentAdmin() : null;
  const canManageEditions = hasRole(admin, "admin");

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader
        eyebrow="Leadership"
        title="Leadership & Administrations"
        newHref="/admin/leadership/new"
        newLabel="Assign Role"
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/leadership/people"
          className="rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep"
        >
          Manage People →
        </Link>
        {canManageEditions && (
          <Link
            href="/admin/leadership/editions/new"
            className="rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep"
          >
            + New Edition
          </Link>
        )}
      </div>

      <CmsConnectionGate configured={configured}>
        {editions.length === 0 ? (
          <CmsEmptyState
            title="No editions yet"
            description="Create an edition (e.g. 2026/27) before assigning leadership roles — every role belongs to a specific administration."
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap gap-2 border-b border-hairline pb-6">
              {editions.map((ed) => (
                <Link
                  key={ed.id}
                  href={`/admin/leadership?edition=${ed.id}`}
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

            {activeEdition && !activeEdition.is_current && canManageEditions && (
              <form
                action={async () => {
                  "use server";
                  await setCurrentEditionAction(activeEdition.id);
                }}
                className="mb-6"
              >
                <button
                  type="submit"
                  className="rounded-[2px] border border-gold/50 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-gold"
                >
                  Set {activeEdition.label} as the current administration
                </button>
              </form>
            )}

            {roles.length === 0 ? (
              <CmsEmptyState
                title={`No roles assigned for ${activeEdition?.label}`}
                description="Assign a person to a role for this edition."
              />
            ) : (
              <div className="border-t border-hairline">
                {roles.map((role) => {
                  // A department_admin sees every role (broad admin read),
                  // but can only delete ones in their own department —
                  // withhold the button on rows they can't touch rather
                  // than showing one that will only come back rejected.
                  const canWrite = !admin || canWriteScopedRow(admin, role.department_id ?? null);
                  return (
                    <CmsTableRow
                      key={role.id}
                      title={`${role.role_title}${role.profile ? " — " + role.profile.full_name : " (unassigned)"}`}
                      meta={role.department?.name ?? (role.is_executive ? "Executive" : undefined)}
                      status={role.status}
                      editHref={`/admin/leadership/${role.id}`}
                      previewHref={role.profile ? `/leadership/${role.profile.slug}` : undefined}
                      actions={
                        canWrite
                          ? [
                              {
                                label: "Delete",
                                variant: "danger",
                                formAction: async () => {
                                  "use server";
                                  await deleteLeadershipRoleAction(role.id);
                                },
                              },
                            ]
                          : []
                      }
                    />
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
