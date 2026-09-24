"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAnyAdmin } from "@/lib/auth/require-admin";
import { hasRole } from "@/lib/auth/current-admin";
import { canWriteScopedRow, canWriteOwnDepartment, canManageCsr } from "@/lib/auth/department-scope";
import type { Admin, ContentStatus } from "@/types/database";

/**
 * Which tables a department_admin can touch through these three shared
 * helpers, and how ownership of a specific row is established for each —
 * mirroring the RLS policies exactly (see supabase/migrations/002 and
 * 003). Every table NOT listed here (announcements, events, conferences,
 * moots, research, partners) has no department_admin RLS policy at all,
 * so those keep the original editor+/admin+-only behavior unchanged below
 * — this function simply returns false for them, which is the same
 * outcome as before this change.
 *
 * `action` matters: `departments` only has an UPDATE policy for
 * department_admin (no insert/delete), so a delete attempt on it must
 * fail here even though an update would pass.
 */
async function departmentAdminMayWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  id: string,
  admin: Admin,
  action: "update" | "delete"
): Promise<boolean> {
  if (admin.role !== "department_admin") return false;

  if (table === "departments") {
    return action === "update" && canWriteOwnDepartment(admin, id);
  }

  if (table === "publications" || table === "leadership_roles") {
    const { data } = await supabase.from(table).select("department_id").eq("id", id).maybeSingle();
    if (!data) return false;
    return canWriteScopedRow(admin, (data as { department_id: string | null }).department_id);
  }

  if (table === "csr_projects") {
    const { data } = await supabase.from("departments").select("id").eq("slug", "csr").maybeSingle();
    const csrDepartmentId = (data as { id: string } | null)?.id ?? null;
    return canManageCsr(admin, csrDepartmentId);
  }

  return false;
}

/**
 * Shared authorization step for setContentStatus/toggleFeatured: an
 * editor+ always passes (unchanged from before this change); otherwise a
 * department_admin may pass only for the specific table/row/action
 * combination RLS grants them. Throws the same clean error either way —
 * a department_admin attempting a table or row they don't own gets a
 * real rejection here rather than a silent RLS no-op.
 */
async function authorizeUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  id: string
): Promise<Admin> {
  const admin = await requireAnyAdmin();
  if (hasRole(admin, "editor")) return admin;
  if (await departmentAdminMayWrite(supabase, table, id, admin, "update")) return admin;
  throw new Error("Not authorised: your account does not have permission for this action.");
}

/**
 * Generic publish/archive/feature-toggle mutation, reused by every content
 * module's row actions so each doesn't need its own copy of this logic.
 * RLS still enforces who's actually allowed to write — this is just the
 * one shared code path that calls .update().
 */
export async function setContentStatus(
  table: string,
  id: string,
  status: ContentStatus,
  revalidatePaths: string[]
) {
  const supabase = await createClient();
  await authorizeUpdate(supabase, table, id);
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePaths.forEach((p) => revalidatePath(p));
}

export async function toggleFeatured(
  table: string,
  id: string,
  featured: boolean,
  revalidatePaths: string[]
) {
  const supabase = await createClient();
  await authorizeUpdate(supabase, table, id);
  const { error } = await supabase.from(table).update({ featured }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePaths.forEach((p) => revalidatePath(p));
}

export async function deleteContent(
  table: string,
  id: string,
  revalidatePaths: string[]
) {
  // Deletion is destructive and irreversible — require admin (or a
  // department_admin deleting their own department-scoped row, where RLS
  // permits it — see departmentAdminMayWrite), not merely editor.
  const supabase = await createClient();
  const admin = await requireAnyAdmin();
  if (!hasRole(admin, "admin") && !(await departmentAdminMayWrite(supabase, table, id, admin, "delete"))) {
    throw new Error("Not authorised: your account does not have permission for this action.");
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePaths.forEach((p) => revalidatePath(p));
}
