import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { listDepartments } from "@/lib/queries/departments";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { createAnnouncementAction } from "@/lib/actions/announcements";

export default async function NewAnnouncementPage() {
  const departments = await listDepartments().catch(() => []);
  const canNotify = hasRole(await getCurrentAdmin(), "admin");
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold-on-light">Announcements</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Announcement</h1>
      <AnnouncementForm action={createAnnouncementAction} departments={departments} canNotify={canNotify} />
    </div>
  );
}
