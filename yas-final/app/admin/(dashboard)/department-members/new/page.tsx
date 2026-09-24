import { listEditions, listProfiles } from "@/lib/queries/leadership";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { DepartmentMemberForm } from "@/components/admin/department-member-form";
import { createDepartmentMemberAction } from "@/lib/actions/department-members";

export default async function NewDepartmentMemberPage() {
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
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Departments</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Add Department Member</h1>
      <DepartmentMemberForm
        editions={editions}
        profiles={profiles}
        departments={departments}
        lockedDepartment={lockedDepartment}
        action={createDepartmentMemberAction}
      />
    </div>
  );
}
