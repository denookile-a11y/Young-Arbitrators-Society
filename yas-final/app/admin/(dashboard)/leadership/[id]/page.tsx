import { notFound } from "next/navigation";
import { getLeadershipRole, listEditions, listProfiles } from "@/lib/queries/leadership";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { updateLeadershipRoleAction } from "@/lib/actions/leadership";
import { LeadershipRoleForm } from "@/components/admin/leadership-role-form";

export default async function EditLeadershipRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [role, editions, profiles, departments, admin] = await Promise.all([
    getLeadershipRole(id),
    listEditions(),
    listProfiles(),
    listDepartments(),
    getCurrentAdmin(),
  ]);
  if (!role) notFound();

  const lockedDepartment =
    admin?.role === "department_admin"
      ? (departments.find((d) => d.id === admin.department_id) ?? null)
      : null;

  const boundAction = updateLeadershipRoleAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Leadership</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">
        Edit — {role.role_title}
      </h1>
      <LeadershipRoleForm
        role={role}
        editions={editions}
        profiles={profiles}
        departments={departments}
        lockedDepartment={lockedDepartment}
        action={boundAction}
      />
    </div>
  );
}
