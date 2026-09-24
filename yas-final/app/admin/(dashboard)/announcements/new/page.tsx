import { AnnouncementForm } from "@/components/admin/announcement-form";
import { createAnnouncementAction } from "@/lib/actions/announcements";

export default function NewAnnouncementPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Announcements</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Announcement</h1>
      <AnnouncementForm action={createAnnouncementAction} />
    </div>
  );
}
