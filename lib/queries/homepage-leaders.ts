import { getCurrentEdition, listLeadershipRolesForEdition, type LeadershipRoleWithProfile } from "@/lib/queries/leadership";
import type { Profile } from "@/types/database";

export type HomepageLeader = LeadershipRoleWithProfile & { profile: Profile };

/**
 * Pure selection rule, exported so it can be tested without a database.
 *
 * Input: ONE edition's roles (already scoped by the caller).
 * Keeps a role only if the role is published AND its person's profile is
 * published AND the profile actually came back (RLS hides unpublished profiles,
 * which makes the embedded profile null; /leadership shows those as
 * "Unassigned", the homepage simply omits them).
 *
 * Order mirrors /leadership: executives first, then the admin's manual
 * order_index, then name (so ties are stable). A person holding several roles
 * in the edition appears ONCE, under their highest-ranked role.
 *
 * Deliberately NOT filtered by is_executive and NOT limited in number: every
 * current committee member is shown.
 */
export function selectHomepageCommittee(roles: LeadershipRoleWithProfile[]): HomepageLeader[] {
  const eligible = roles.filter(
    (r): r is HomepageLeader => r.status === "published" && r.profile != null && r.profile.status === "published"
  );
  eligible.sort(
    (a, b) =>
      Number(b.is_executive) - Number(a.is_executive) ||
      a.order_index - b.order_index ||
      a.profile.full_name.localeCompare(b.profile.full_name)
  );
  const seen = new Set<string>();
  return eligible.filter((r) => (seen.has(r.profile.id) ? false : (seen.add(r.profile.id), true)));
}

/**
 * Current committee for the homepage. "Current" is defined exactly as on
 * /leadership: the edition flagged editions.is_current (the database allows
 * only one). Roles of any other edition never appear, whatever their status.
 */
export async function listHomepageLeaders(): Promise<HomepageLeader[]> {
  const edition = await getCurrentEdition();
  if (!edition) return [];
  return selectHomepageCommittee(await listLeadershipRolesForEdition(edition.id));
}
