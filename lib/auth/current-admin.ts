import { createClient } from "@/lib/supabase/server";
import type { Admin, AdminRole } from "@/types/database";

/**
 * Returns the currently authenticated admin's row (auth user + role), or
 * null if not logged in / not an active admin. Use this in Server
 * Components and Server Actions to gate UI and check role before allowing
 * a mutation — this is a convenience wrapper; the actual enforcement is
 * still the RLS policies in the database, since this check alone can
 * theoretically be bypassed by a malformed request hitting Postgres
 * directly. Defense in depth: check here for UX, rely on RLS for security.
 */
export async function getCurrentAdmin(): Promise<Admin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  return (admin as Admin | null) ?? null;
}

const ROLE_RANK: Record<AdminRole, number> = {
  department_admin: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

/**
 * Mirrors the has_role() SQL function exactly. Used for UI gating and as
 * the application-layer half of defence in depth; RLS remains the
 * authoritative enforcement.
 *
 * department_admin is a SCOPE-LIMITED role, not the bottom of a ladder —
 * asking for it means "is this specifically a department admin", not "is
 * this anyone at all". The previous `return true` here (and the matching
 * `else true` in SQL) made every active admin satisfy that check.
 */
export function hasRole(admin: Admin | null, minRole: AdminRole): boolean {
  if (!admin) return false;
  if (minRole === "department_admin") return admin.role === "department_admin";
  return ROLE_RANK[admin.role] >= ROLE_RANK[minRole];
}
