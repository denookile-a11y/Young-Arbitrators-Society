import { createClient } from "@/lib/supabase/server";
import type { DepartmentMember, Profile, Department, Edition } from "@/types/database";

export interface DepartmentMemberWithRelations extends DepartmentMember {
  profile: Profile | null;
  department: Department | null;
  edition: Edition | null;
}

/**
 * All department_members for one edition, joined for display. RLS's own
 * select policy ("department_members follow profile visibility") already
 * limits what an unscoped query sees for a non-admin caller — here every
 * caller is an authenticated admin, so is_admin() applies and this
 * returns every row for the edition regardless of the profile's status,
 * matching how listLeadershipRolesForEdition behaves for the same reason.
 */
export async function listDepartmentMembersForEdition(
  editionId: string
): Promise<DepartmentMemberWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("department_members")
    .select("*, profile:profiles(*), department:departments(*), edition:editions(*)")
    .eq("edition_id", editionId)
    .order("order_index", { ascending: true })
    .returns<DepartmentMemberWithRelations[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDepartmentMember(id: string): Promise<DepartmentMemberWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("department_members")
    .select("*, profile:profiles(*), department:departments(*), edition:editions(*)")
    .eq("id", id)
    .maybeSingle<DepartmentMemberWithRelations>();
  if (error) throw new Error(error.message);
  return data;
}
