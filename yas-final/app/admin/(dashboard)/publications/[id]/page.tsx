import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Publication } from "@/types/database";
import { updatePublicationAction } from "@/lib/actions/publications";
import { PublicationForm } from "@/components/admin/publication-form";
import { listDepartments } from "@/lib/queries/departments";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function EditPublicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [publication, departments, admin] = await Promise.all([
    getContentById<Publication>("publications", id),
    listDepartments(),
    getCurrentAdmin(),
  ]);
  if (!publication) notFound();

  const lockedDepartment =
    admin?.role === "department_admin"
      ? (departments.find((d) => d.id === admin.department_id) ?? null)
      : null;

  const boundAction = updatePublicationAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Publications</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {publication.title}</h1>
      <PublicationForm
        publication={publication}
        departments={departments}
        lockedDepartment={lockedDepartment}
        action={boundAction}
      />
    </div>
  );
}
