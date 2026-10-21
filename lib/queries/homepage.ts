import { createClient } from "@/lib/supabase/server";
import { unstable_rethrow } from "next/navigation";
import { listGlobalAnnouncements } from "@/lib/queries/announcements";
import { listHomepageLeaders, type HomepageLeader } from "@/lib/queries/homepage-leaders";
import type { Announcement, Conference, Partner, Publication, Research } from "@/types/database";

export interface HomepageStats {
  memberCount: number;
  eventCount: number;
  mootCount: number;
  publicationCount: number;
  partnerCount: number;
}

export interface HomepageData {
  announcements: Announcement[];
  /** True if the announcements query failed (render an error state, not an empty one). */
  announcementsFailed: boolean;
  leaders: HomepageLeader[];
  leadersFailed: boolean;
  featuredResearch: Research | null;
  upcomingConference: Conference | null;
  latestPublications: Publication[];
  partners: Partner[];
  stats: HomepageStats;
}

/**
 * Real Supabase queries for the homepage's curated sections. Per the
 * directive, the homepage stays a concise gateway — this pulls only
 * featured/upcoming items, never a full dump of any table.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient();

  const [announcements, leaders, research, conference, publications, partners, memberCount, eventCount, mootCount, publicationCount, partnerCount] = await Promise.all([
    // Published, in-window, GLOBAL announcements only (department-specific
    // ones belong on their department page). A failure must not take the
    // homepage down, but it must also not masquerade as "no announcements".
    listGlobalAnnouncements(6)
      .then((data) => ({ data, failed: false }))
      .catch((error: Error) => {
        unstable_rethrow(error);
        console.error("Homepage: announcements query failed", error.message);
        return { data: [] as Announcement[], failed: true };
      }),
    // Executive roles of the current edition (see homepage-leaders.ts). A
    // failure must not take the homepage down nor read as "no leadership".
    listHomepageLeaders()
      .then((data) => ({ data, failed: false }))
      .catch((error: Error) => {
        unstable_rethrow(error);
        console.error("Homepage: leadership query failed", error.message);
        return { data: [] as HomepageLeader[], failed: true };
      }),
    supabase
      .from("research")
      .select("*")
      .eq("status", "published")
      .eq("featured", true)
      .order("published_on", { ascending: false })
      .limit(1)
      .returns<Research[]>(),
    supabase
      .from("conferences")
      .select("*")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .returns<Conference[]>(),
    supabase
      .from("publications")
      .select("*")
      .eq("status", "published")
      .order("published_on", { ascending: false })
      .limit(4)
      .returns<Publication[]>(),
    supabase
      .from("partners")
      .select("*")
      .eq("status", "published")
      .order("order_index", { ascending: true })
      .returns<Partner[]>(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("moots").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("publications").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  return {
    announcements: announcements.data,
    announcementsFailed: announcements.failed,
    leaders: leaders.data,
    leadersFailed: leaders.failed,
    featuredResearch: research.data?.[0] ?? null,
    upcomingConference: conference.data?.[0] ?? null,
    latestPublications: publications.data ?? [],
    partners: partners.data ?? [],
    stats: {
      memberCount: memberCount.count ?? 0,
      eventCount: eventCount.count ?? 0,
      mootCount: mootCount.count ?? 0,
      publicationCount: publicationCount.count ?? 0,
      partnerCount: partnerCount.count ?? 0,
    },
  };
}
