import { redirect } from "next/navigation";
import { DepartmentForm } from "@/components/admin/department-form";
import { createDepartmentAction } from "@/lib/actions/departments";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";

export default async function NewDepartmentPage() {
  const admin = await getCurrentAdmin();
  // departments has no insert policy for department_admin at all — RLS
  // only grants them update on their own row. Block the page itself
  // rather than showing a create form that can only ever fail.
  if (!hasRole(admin, "admin")) {
    redirect("/admin/departments?toast=Not authorised to create departments");
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">
        Departments
      </span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">
        New Department
      </h1>
      <DepartmentForm action={createDepartmentAction} />
    </div>
  );
}
