import { listEditions, listProfiles } from "@/lib/queries/leadership";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { LeadershipRoleForm } from "@/components/admin/leadership-role-form";
import { createLeadershipRoleAction } from "@/lib/actions/leadership";

export default async function NewLeadershipRolePage() {
  const [editions, profiles, departments, admin] = await Promise.all([
    listEditions(),
    listProfiles(),
    listDepartments(),
    getCurrentAdmin(),
  ]);

  const lockedDepartment =
    admin?.role === "department_admin"
      ? (departments.find((d) => d.id === admin.department_id) ?? null)
      : null;

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Leadership</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Assign Role</h1>
      <LeadershipRoleForm
        editions={editions}
        profiles={profiles}
        departments={departments}
        lockedDepartment={lockedDepartment}
        action={createLeadershipRoleAction}
      />
    </div>
  );
}
