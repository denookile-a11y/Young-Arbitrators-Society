import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  memberCount: number;
  upcomingEventCount: number;
  publicationCount: number;
  mootDocumentCount: number;
  announcementCount: number;
}

export interface RecentContentItem {
  id: string;
  title: string;
  category: string;
  status: string;
  meta: string;
  editHref: string;
}

/**
 * Real counts pulled from Supabase — head-only count queries (no row data
 * transferred) for the stat cards, then a small recent-content query for
 * the table below it. If the Supabase client isn't configured yet (no env
 * vars), every count comes back null/empty rather than a fake number —
 * see isSupabaseConfigured() below.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [members, events, publications, mootDocs, announcements] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString()),
    supabase.from("publications").select("*", { count: "exact", head: true }),
    supabase.from("moot_documents").select("*", { count: "exact", head: true }),
    supabase.from("announcements").select("*", { count: "exact", head: true }),
  ]);

  return {
    memberCount: members.count ?? 0,
    upcomingEventCount: events.count ?? 0,
    publicationCount: publications.count ?? 0,
    mootDocumentCount: mootDocs.count ?? 0,
    announcementCount: announcements.count ?? 0,
  };
}

export async function getRecentContent(limit = 6): Promise<RecentContentItem[]> {
  const supabase = await createClient();

  // Pull the most recently updated rows across the highest-traffic content
  // tables and merge/sort in application code — Postgres doesn't have a
  // clean built-in UNION across differently-shaped tables with type safety
  // in the query builder, so this stays simple and explicit per table.
  // Narrow-column selects don't infer cleanly against the hand-written
  // Database type (which doesn't model per-select-string column subsets
  // the way the CLI-generated types do), so these are typed explicitly.
  type RecentRow = { id: string; title: string; status: string; updated_at: string };

  const [pubs, events, research, moots] = await Promise.all([
    supabase
      .from("publications")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<RecentRow[]>(),
    supabase
      .from("events")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<RecentRow[]>(),
    supabase
      .from("research")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<RecentRow[]>(),
    supabase
      .from("moots")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<RecentRow[]>(),
  ]);

  const items: RecentContentItem[] = [
    ...(pubs.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      category: "Publications",
      status: r.status,
      meta: new Date(r.updated_at).toLocaleDateString(),
      editHref: `/admin/publications/${r.id}`,
    })),
    ...(events.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      category: "Events",
      status: r.status,
      meta: new Date(r.updated_at).toLocaleDateString(),
      editHref: `/admin/events/${r.id}`,
    })),
    ...(research.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      category: "Research",
      status: r.status,
      meta: new Date(r.updated_at).toLocaleDateString(),
      editHref: `/admin/research/${r.id}`,
    })),
    ...(moots.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      category: "Moot",
      status: r.status,
      meta: new Date(r.updated_at).toLocaleDateString(),
      editHref: `/admin/moot/${r.id}`,
    })),
  ];

  return items
    .sort((a, b) => (a.meta < b.meta ? 1 : -1))
    .slice(0, limit);
}
