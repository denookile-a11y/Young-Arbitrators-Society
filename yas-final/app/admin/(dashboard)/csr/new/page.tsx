import { redirect } from "next/navigation";
import { CsrProjectForm } from "@/components/admin/csr-project-form";
import { createCsrProjectAction, canManageCsrProjects } from "@/lib/actions/csr";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export default async function NewCsrProjectPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !(await canManageCsrProjects(admin))) {
    redirect("/admin/csr?toast=Not authorised to manage CSR projects");
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">CSR</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New CSR Project</h1>
      <CsrProjectForm action={createCsrProjectAction} />
    </div>
  );
}
