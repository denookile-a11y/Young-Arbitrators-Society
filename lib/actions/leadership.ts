"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin, checkAnyAdmin } from "@/lib/auth/require-admin";
import { hasRole } from "@/lib/auth/current-admin";
import { canWriteScopedRow, resolveWriteDepartmentId } from "@/lib/auth/department-scope";
import { leadershipRoleSchema } from "@/lib/validation/content";

export interface LeadershipRoleFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

function parseForm(formData: FormData) {
  return leadershipRoleSchema.safeParse({
    edition_id: formData.get("edition_id"),
    profile_id: formData.get("profile_id"),
    role_title: formData.get("role_title"),
    department_id: formData.get("department_id") || "",
    is_executive: formData.get("is_executive") === "on",
    order_index: formData.get("order_index") || 0,
    status: formData.get("status"),
  });
}

export async function createLeadershipRoleAction(
  _prev: LeadershipRoleFormState,
  formData: FormData
): Promise<LeadershipRoleFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const dept = resolveWriteDepartmentId(admin, parsed.data.department_id || null);
  if (!dept.ok) return { error: dept.error };

  const supabase = await createClient();
  const { error } = await supabase.from("leadership_roles").insert({
    ...parsed.data,
    department_id: dept.departmentId,
  });
  if (error) {
    console.error("createLeadershipRoleAction: insert failed", error);
    return { error: "Something went wrong saving this role. Please try again." };
  }

  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership?toast=Role assigned");
}

export async function updateLeadershipRoleAction(
  id: string,
  _prev: LeadershipRoleFormState,
  formData: FormData
): Promise<LeadershipRoleFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const supabase = await createClient();

  if (admin.role === "department_admin") {
    const { data: existing, error: fetchError } = await supabase
      .from("leadership_roles")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !existing) return { error: "That role could not be found." };
    if (!canWriteScopedRow(admin, (existing as { department_id: string | null }).department_id)) {
      return { error: "Not authorised: this role belongs to a different department." };
    }
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const dept = resolveWriteDepartmentId(admin, parsed.data.department_id || null);
  if (!dept.ok) return { error: dept.error };

  const { error } = await supabase
    .from("leadership_roles")
    .update({ ...parsed.data, department_id: dept.departmentId })
    .eq("id", id);
  if (error) {
    console.error("updateLeadershipRoleAction: update failed", error);
    return { error: "Something went wrong saving this role. Please try again." };
  }

  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership?toast=Role updated");
}

export async function deleteLeadershipRoleAction(id: string) {
  const admin = await (async () => {
    const result = await checkAnyAdmin();
    if ("error" in result) throw new Error(result.error);
    return result.admin;
  })();

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    throw new Error("Not authorised: your account does not have permission for this action.");
  }

  const supabase = await createClient();

  if (admin.role === "department_admin") {
    const { data: existing, error: fetchError } = await supabase
      .from("leadership_roles")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !existing) throw new Error("That role could not be found.");
    if (!canWriteScopedRow(admin, (existing as { department_id: string | null }).department_id)) {
      throw new Error("Not authorised: this role belongs to a different department.");
    }
  }

  const { error } = await supabase.from("leadership_roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership?toast=Role removed");
}

export interface EditionFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Creates a new edition. Does NOT automatically flip is_current — that's a
 * deliberate separate action (setCurrentEditionAction) so switching the
 * "live" administration is an explicit, confirmable step, not a side
 * effect of adding next year's edition early.
 */
export async function createEditionAction(
  _prev: EditionFormState,
  formData: FormData
): Promise<EditionFormState> {
  const authError = await checkAdmin("admin");
  if (authError) return { error: authError };

  const label = formData.get("label") as string;
  const starts_on = formData.get("starts_on") as string;

  if (!label || !starts_on) {
    return { fieldErrors: { label: !label ? "Label is required" : "", starts_on: !starts_on ? "Start date is required" : "" } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("editions").insert({ label, starts_on });
  if (error) return { error: error.message };

  revalidatePath("/admin/leadership");
  revalidatePath("/archive");
  redirect("/admin/leadership?toast=Edition created");
}

export async function setCurrentEditionAction(editionId: string) {
  await requireAdmin("admin");

  const supabase = await createClient();

  // Single atomic transaction via set_current_edition() (migration 005).
  // Doing this as two separate PostgREST updates was not transactional: a
  // failure between them left the site with no current edition at all.
  const { error } = await supabase.rpc("set_current_edition", {
    target_edition: editionId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  revalidatePath("/archive");
  redirect("/admin/leadership?toast=Current edition updated");
}
