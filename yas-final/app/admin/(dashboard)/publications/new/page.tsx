import { PublicationForm } from "@/components/admin/publication-form";
import { createPublicationAction } from "@/lib/actions/publications";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function NewPublicationPage() {
  const [departments, admin] = await Promise.all([listDepartments(), getCurrentAdmin()]);
  const lockedDepartment =
    admin?.role === "department_admin"
      ? (departments.find((d) => d.id === admin.department_id) ?? null)
      : null;

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Publications</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Publication</h1>
      <PublicationForm departments={departments} lockedDepartment={lockedDepartment} action={createPublicationAction} />
    </div>
  );
}
