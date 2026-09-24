import { createClient } from "@/lib/supabase/server";
import type { Edition, LeadershipRole, Profile, Department } from "@/types/database";

export interface LeadershipRoleWithProfile extends LeadershipRole {
  profile: Profile | null;
  department: Department | null;
}

export async function listEditions(): Promise<Edition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editions")
    .select("*")
    .order("starts_on", { ascending: false })
    .returns<Edition[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCurrentEdition(): Promise<Edition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editions")
    .select("*")
    .eq("is_current", true)
    .maybeSingle<Edition>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true })
    .returns<Profile[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Leadership roles for one edition, joined with the profile (name/portrait)
 * and department (for department-head roles). Ordered so executives
 * (President/VP) surface first, then by order_index within that.
 */
export async function listLeadershipRolesForEdition(
  editionId: string
): Promise<LeadershipRoleWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leadership_roles")
    .select("*, profile:profiles(*), department:departments(*)")
    .eq("edition_id", editionId)
    .order("is_executive", { ascending: false })
    .order("order_index", { ascending: true })
    .returns<LeadershipRoleWithProfile[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLeadershipRole(id: string): Promise<LeadershipRoleWithProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leadership_roles")
    .select("*, profile:profiles(*), department:departments(*)")
    .eq("id", id)
    .maybeSingle<LeadershipRoleWithProfile>();
  if (error) throw new Error(error.message);
  return data;
}
