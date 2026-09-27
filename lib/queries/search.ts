import { createClient } from "@/lib/supabase/server";
import { toSearchPattern } from "@/lib/queries/search-sanitize";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import type {
  Research,
  Publication,
  Event,
  Conference,
  Moot,
  Profile,
  Department,
} from "@/types/database";

export interface SearchHit {
  id: string;
  title: string;
  meta?: string;
  href: string;
}

export interface SearchResults {
  groups: { label: string; hits: SearchHit[] }[];
  totalHits: number;
}

// Cap per content type so one very common term can't pull thousands of
// rows across seven tables in a single request.
const PER_TYPE_LIMIT = 8;

/**
 * Cross-content search over the public, published record set.
 *
 * Uses Postgres `ilike` via PostgREST's `.or()` for case-insensitive
 * substring matching across each type's most relevant text columns. This
 * is deliberately simple and dependency-free; if the corpus grows large
 * enough for `ilike` scans to hurt, the upgrade path is a generated
 * tsvector column plus a GIN index and `.textSearch()`, which would not
 * change this function's signature.
 *
 * Every query filters `status = 'published'` at the database level — draft
 * and archived content is never searchable publicly, matching the RLS
 * policies rather than relying on them alone.
 */
export async function searchPublicContent(rawQuery: string): Promise<SearchResults> {
  // Sanitization and empty-input handling are unit-tested directly — see
  // lib/queries/search-sanitize.test.ts.
  const pattern = toSearchPattern(rawQuery);
  if (!pattern) return { groups: [], totalHits: 0 };

  // SECURITY FIX (v10): search fans out to seven parallel queries per call
  // and has no auth requirement — a scripted requester can trivially drive
  // repeated expensive fan-out. Rate-limit by IP; a real user typing in
  // the search box will never approach this limit, since Next only
  // re-renders the page on navigation (i.e. on Enter/submit), not per
  // keystroke.
  const identifier = await getClientIdentifier();
  const limit = checkRateLimit(identifier, { name: "search", windowMs: 60_000, max: 30 });
  if (!limit.ok) return { groups: [], totalHits: 0 };

  const supabase = await createClient();

  const [research, publications, events, conferences, moots, profiles, departments] =
    await Promise.all([
      supabase
        .from("research")
        .select("id, title, slug, category, abstract")
        .eq("status", "published")
        .or(`title.ilike.${pattern},abstract.ilike.${pattern},topic.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Research, "id" | "title" | "slug" | "category" | "abstract">[]>(),

      supabase
        .from("publications")
        .select("id, title, slug, category, excerpt")
        .eq("status", "published")
        .or(`title.ilike.${pattern},excerpt.ilike.${pattern},body.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Publication, "id" | "title" | "slug" | "category" | "excerpt">[]>(),

      supabase
        .from("events")
        .select("id, title, slug, venue, starts_at")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern},venue.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Event, "id" | "title" | "slug" | "venue" | "starts_at">[]>(),

      supabase
        .from("conferences")
        .select("id, title, slug, venue, theme")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern},theme.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Conference, "id" | "title" | "slug" | "venue" | "theme">[]>(),

      supabase
        .from("moots")
        .select("id, title, slug, year, theme")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern},theme.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Moot, "id" | "title" | "slug" | "year" | "theme">[]>(),

      supabase
        .from("profiles")
        .select("id, full_name, slug, bio")
        .eq("status", "published")
        .or(`full_name.ilike.${pattern},bio.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Profile, "id" | "full_name" | "slug" | "bio">[]>(),

      supabase
        .from("departments")
        .select("id, name, slug, tagline")
        .eq("status", "published")
        .or(`name.ilike.${pattern},tagline.ilike.${pattern},mandate.ilike.${pattern}`)
        .limit(PER_TYPE_LIMIT)
        .returns<Pick<Department, "id" | "name" | "slug" | "tagline">[]>(),
    ]);

  const groups: { label: string; hits: SearchHit[] }[] = [
    {
      label: "Research",
      hits: (research.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        meta: r.category ?? undefined,
        href: `/research/${r.slug}`,
      })),
    },
    {
      label: "Publications",
      hits: (publications.data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        meta: p.category ?? undefined,
        href: `/publications/${p.slug}`,
      })),
    },
    {
      label: "Events",
      hits: (events.data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        meta: e.venue ?? undefined,
        href: `/events/${e.slug}`,
      })),
    },
    {
      label: "Conferences",
      hits: (conferences.data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        meta: c.theme ?? c.venue ?? undefined,
        href: `/conferences/${c.slug}`,
      })),
    },
    {
      label: "Moot",
      hits: (moots.data ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        meta: String(m.year),
        href: `/moot/${m.slug}`,
      })),
    },
    {
      label: "People",
      hits: (profiles.data ?? []).map((p) => ({
        id: p.id,
        title: p.full_name,
        href: `/leadership/${p.slug}`,
      })),
    },
    {
      label: "Departments",
      hits: (departments.data ?? []).map((d) => ({
        id: d.id,
        title: d.name,
        meta: d.tagline ?? undefined,
        href: `/departments/${d.slug}`,
      })),
    },
  ].filter((g) => g.hits.length > 0);

  return {
    groups,
    totalHits: groups.reduce((sum, g) => sum + g.hits.length, 0),
  };
}
