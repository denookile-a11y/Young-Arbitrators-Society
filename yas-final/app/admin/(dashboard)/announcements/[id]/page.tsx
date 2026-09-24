import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Announcement } from "@/types/database";
import { updateAnnouncementAction } from "@/lib/actions/announcements";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcement = await getContentById<Announcement>("announcements", id);
  if (!announcement) notFound();

  const boundAction = updateAnnouncementAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Announcements</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {announcement.title}</h1>
      <AnnouncementForm announcement={announcement} action={boundAction} />
    </div>
  );
}
