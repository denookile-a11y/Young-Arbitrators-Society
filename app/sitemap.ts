import type { MetadataRoute } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

const STATIC_ROUTES = [
  "", "about", "leadership", "departments", "moot", "research", "events",
  "conferences", "publications", "gallery", "partners", "csr", "join",
  "contact", "archive", "search",
];

/**
 * Combines the fixed top-level routes with every published slug from the
 * content tables. Returns just the static routes when Supabase isn't
 * configured, rather than erroring the whole sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yas.example.com";

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}/${route}`.replace(/\/$/, "") || baseUrl,
    lastModified: new Date(),
  }));

  if (!isSupabaseConfigured()) return staticEntries;

  const supabase = await createClient();

  const [research, events, conferences, moots, publications, galleries, departments] =
    await Promise.all([
      supabase.from("research").select("slug, updated_at").eq("status", "published"),
      supabase.from("events").select("slug, updated_at").eq("status", "published"),
      supabase.from("conferences").select("slug, updated_at").eq("status", "published"),
      supabase.from("moots").select("slug, updated_at").eq("status", "published"),
      supabase.from("publications").select("slug, updated_at").eq("status", "published"),
      supabase.from("galleries").select("slug, updated_at").eq("status", "published"),
      supabase.from("departments").select("slug, updated_at").eq("status", "published"),
    ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...(research.data ?? []).map((r) => ({ url: `${baseUrl}/research/${r.slug}`, lastModified: new Date(r.updated_at) })),
    ...(events.data ?? []).map((e) => ({ url: `${baseUrl}/events/${e.slug}`, lastModified: new Date(e.updated_at) })),
    ...(conferences.data ?? []).map((c) => ({ url: `${baseUrl}/conferences/${c.slug}`, lastModified: new Date(c.updated_at) })),
    ...(moots.data ?? []).map((m) => ({ url: `${baseUrl}/moot/${m.slug}`, lastModified: new Date(m.updated_at) })),
    ...(publications.data ?? []).map((p) => ({ url: `${baseUrl}/publications/${p.slug}`, lastModified: new Date(p.updated_at) })),
    ...(galleries.data ?? []).map((g) => ({ url: `${baseUrl}/gallery/${g.slug}`, lastModified: new Date(g.updated_at) })),
    ...(departments.data ?? []).map((d) => ({ url: `${baseUrl}/departments/${d.slug}`, lastModified: new Date(d.updated_at) })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
