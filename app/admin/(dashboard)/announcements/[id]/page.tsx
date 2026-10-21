import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Announcement } from "@/types/database";
import { updateAnnouncementAction } from "@/lib/actions/announcements";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { listDepartments } from "@/lib/queries/departments";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcement = await getContentById<Announcement>("announcements", id);
  if (!announcement) notFound();

  const departments = await listDepartments().catch(() => []);
  const canNotify = hasRole(await getCurrentAdmin(), "admin");
  const boundAction = updateAnnouncementAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold-on-light">Announcements</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {announcement.title}</h1>
      <AnnouncementForm announcement={announcement} action={boundAction} departments={departments} canNotify={canNotify} />
    </div>
  );
}
