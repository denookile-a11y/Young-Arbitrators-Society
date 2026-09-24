import { notFound, redirect } from "next/navigation";
import { getDepartmentMember } from "@/lib/queries/department-members";
import { listEditions, listProfiles } from "@/lib/queries/leadership";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { canWriteScopedRow } from "@/lib/auth/department-scope";
import { updateDepartmentMemberAction } from "@/lib/actions/department-members";
import { DepartmentMemberForm } from "@/components/admin/department-member-form";

export default async function EditDepartmentMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, editions, profiles, departments, admin] = await Promise.all([
    getDepartmentMember(id),
    listEditions(),
    listProfiles(),
    listDepartments(),
    getCurrentAdmin(),
  ]);
  if (!member) notFound();

  // Page-level protection, not just the form action: a department_admin
  // must not land on another department's member-edit screen just by
  // typing its URL, even though RLS/the action would still block the
  // actual write.
  if (admin?.role === "department_admin" && !canWriteScopedRow(admin, member.department_id)) {
    redirect("/admin/department-members?toast=Not authorised for that department");
  }

  const lockedDepartment =
    admin?.role === "department_admin"
      ? (departments.find((d) => d.id === admin.department_id) ?? null)
      : null;

  const boundAction = updateDepartmentMemberAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Departments</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">
        Edit Member — {member.profile?.full_name ?? "Unassigned"}
      </h1>
      <DepartmentMemberForm
        member={member}
        editions={editions}
        profiles={profiles}
        departments={departments}
        lockedDepartment={lockedDepartment}
        action={boundAction}
      />
    </div>
  );
}
