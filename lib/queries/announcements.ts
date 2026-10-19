import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/types/database";
import { isAnnouncementVisible, visibilityWindowFilter } from "@/lib/announcements/visibility";

/**
 * Public announcement queries. Every one applies the same rule
 * (published AND inside its publish_at/expires_at window), in the query for
 * efficiency and again in JS as a guard, on top of the RLS policy.
 *
 * Scope rule:
 *   - department_id IS NULL  → GLOBAL: homepage (and the /announcements list).
 *   - department_id = X      → shown on department X's page (and the list),
 *                              never on the homepage.
 * Order: featured first, then manual order_index, then newest.
 */
const ORDER = [
  { column: "featured", ascending: false },
  { column: "order_index", ascending: true },
  { column: "publish_at", ascending: false, nullsFirst: false },
  { column: "created_at", ascending: false },
] as const;

type Scope = { global: true } | { departmentId: string } | { all: true };

/** PostgreSQL "undefined_column" — what PostgREST returns when a column does not exist. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""));
}

async function query(scope: Scope, limit: number): Promise<Announcement[]> {
  const supabase = await createClient();
  const now = new Date();

  const run = async (scoped: boolean) => {
    let q = supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .or(visibilityWindowFilter(now));
    if (scoped) {
      if ("global" in scope) q = q.is("department_id", null);
      else if ("departmentId" in scope) q = q.eq("department_id", scope.departmentId);
    }
    for (const o of ORDER) q = q.order(o.column, { ascending: o.ascending, nullsFirst: "nullsFirst" in o ? o.nullsFirst : undefined });
    return q.limit(limit).returns<Announcement[]>();
  };

  let { data, error } = await run(true);
  if (error && isMissingColumn(error) && !("all" in scope)) {
    // Migration 007 (which adds announcements.department_id) has not been applied
    // to this database yet. Before it, no announcement can belong to a department,
    // so: department pages have nothing, and the homepage shows every visible
    // announcement. Without this the public site shows "could not be loaded".
    console.warn("announcements: department_id column missing - apply migration 007. Serving unscoped announcements until then.");
    if ("departmentId" in scope) return [];
    ({ data, error } = await run(false));
  }
  if (error) throw new Error(error.message);
  return (data ?? []).filter((a) => isAnnouncementVisible(a, now));
}

export const listGlobalAnnouncements = (limit = 6) => query({ global: true }, limit);
export const listDepartmentAnnouncements = (departmentId: string, limit = 6) => query({ departmentId }, limit);
export const listAllPublicAnnouncements = (limit = 50) => query({ all: true }, limit);

export async function getPublicAnnouncementBySlug(slug: string): Promise<Announcement | null> {
  const supabase = await createClient();
  const now = new Date();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .or(visibilityWindowFilter(now))
    .maybeSingle<Announcement>();
  if (error) throw new Error(error.message);
  return data && isAnnouncementVisible(data, now) ? data : null;
}
