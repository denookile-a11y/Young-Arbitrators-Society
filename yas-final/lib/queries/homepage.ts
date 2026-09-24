import { createClient } from "@/lib/supabase/server";
import type { Announcement, Conference, Partner, Publication, Research } from "@/types/database";

export interface HomepageData {
  announcements: Announcement[];
  featuredResearch: Research | null;
  upcomingConference: Conference | null;
  latestPublications: Publication[];
  partners: Partner[];
}

/**
 * Real Supabase queries for the homepage's curated sections. Per the
 * directive, the homepage stays a concise gateway — this pulls only
 * featured/upcoming items, never a full dump of any table.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient();

  const [announcements, research, conference, publications, partners] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .eq("featured", true)
      .order("order_index", { ascending: true })
      .limit(6)
      .returns<Announcement[]>(),
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
  ]);

  return {
    announcements: announcements.data ?? [],
    featuredResearch: research.data?.[0] ?? null,
    upcomingConference: conference.data?.[0] ?? null,
    latestPublications: publications.data ?? [],
    partners: partners.data ?? [],
  };
}
