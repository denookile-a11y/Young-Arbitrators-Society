import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { heroImage } from "@/lib/wallpapers";
import { AnnouncementSection } from "@/components/announcements/announcement-list";
import { listAllPublicAnnouncements } from "@/lib/queries/announcements";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Announcement } from "@/types/database";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  let announcements: Announcement[] = [];
  let failed = false;
  if (isSupabaseConfigured()) {
    try {
      announcements = await listAllPublicAnnouncements(50);
    } catch (error) {
      // Never swallow Next's "this route is dynamic" signal (thrown by cookies()):
      // doing so bakes an error state into a statically prerendered page.
      unstable_rethrow(error);
      console.error("Announcements page: query failed", (error as Error).message);
      failed = true;
    }
  }
  return (
    <>
      <SiteNav />
      <PageHero eyebrow="Announcements" title="News from YAS." trail={[{ label: "Announcements" }]} image={heroImage("announcementsIndex")} />
      <AnnouncementSection announcements={announcements} failed={failed} eyebrow="All announcements" title="Everything we have published." showAllLink={false} />
      <SiteFooter />
    </>
  );
}
