import { notFound, redirect } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { CsrProject } from "@/types/database";
import { updateCsrProjectAction, canManageCsrProjects } from "@/lib/actions/csr";
import { CsrProjectForm } from "@/components/admin/csr-project-form";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function EditCsrProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, admin] = await Promise.all([
    getContentById<CsrProject>("csr_projects", id),
    getCurrentAdmin(),
  ]);
  if (!project) notFound();

  if (!admin || !(await canManageCsrProjects(admin))) {
    redirect("/admin/csr?toast=Not authorised to manage CSR projects");
  }

  const boundAction = updateCsrProjectAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">CSR</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {project.title}</h1>
      <CsrProjectForm project={project} action={boundAction} />
    </div>
  );
}
