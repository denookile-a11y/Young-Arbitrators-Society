import { notFound, redirect } from "next/navigation";
import { getDepartment } from "@/lib/queries/departments";
import { updateDepartmentAction } from "@/lib/actions/departments";
import { DepartmentForm } from "@/components/admin/department-form";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [department, admin] = await Promise.all([getDepartment(id), getCurrentAdmin()]);
  if (!department) notFound();

  // Page-level protection, not just the form action: a department_admin
  // must not land on another department's edit screen just by typing its
  // URL, even though RLS itself would still block the actual write.
  if (admin?.role === "department_admin" && admin.department_id !== id) {
    redirect("/admin/departments?toast=Not authorised for that department");
  }

  const boundAction = updateDepartmentAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">
        Departments
      </span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">
        Edit — {department.name}
      </h1>
      <DepartmentForm department={department} action={boundAction} />
    </div>
  );
}
