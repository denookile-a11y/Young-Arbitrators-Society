/**
 * The single definition of "publicly visible announcement", used by every
 * public query and mirrored by the RLS policy in migration 007.
 *
 * Visible = published AND already live (publish_at empty or past) AND not
 * expired (expires_at empty or future).
 */
export interface VisibilityFields {
  status: string;
  publish_at: string | null;
  expires_at: string | null;
}

export function isAnnouncementVisible(a: VisibilityFields, now: Date = new Date()): boolean {
  if (a.status !== "published") return false;
  if (a.publish_at && Date.parse(a.publish_at) > now.getTime()) return false;
  if (a.expires_at && Date.parse(a.expires_at) <= now.getTime()) return false;
  return true;
}

/**
 * PostgREST `or` expression equivalent to the window check. One `or=` only:
 * a window needs (start ok) AND (end ok), expressed as four AND-pairs.
 */
export function visibilityWindowFilter(now: Date = new Date()): string {
  const t = now.toISOString();
  return [
    "and(publish_at.is.null,expires_at.is.null)",
    `and(publish_at.is.null,expires_at.gt.${t})`,
    `and(publish_at.lte.${t},expires_at.is.null)`,
    `and(publish_at.lte.${t},expires_at.gt.${t})`,
  ].join(",");
}
