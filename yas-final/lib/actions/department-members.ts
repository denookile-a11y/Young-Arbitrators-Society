"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAnyAdmin, requireAnyAdmin } from "@/lib/auth/require-admin";
import { hasRole } from "@/lib/auth/current-admin";
import { canWriteScopedRow, resolveWriteDepartmentId } from "@/lib/auth/department-scope";
import { departmentMemberSchema } from "@/lib/validation/content";

/**
 * RLS ("department_members writable by admin+" / "department_admin manages
 * own department_members" — see supabase/migrations/002_people_structure.sql)
 * grants the exact same shape of access as leadership_roles: admin+
 * unscoped, department_admin scoped to their own department_id, which is
 * why this mirrors lib/actions/leadership.ts's create/update/delete
 * structure closely rather than reusing runScopedCreate/runScopedUpdate —
 * department_members has no slug/public detail page of its own to revalidate
 * (members show up embedded on their department's public page), so the
 * generic helper's path-revalidation shape doesn't fit cleanly here.
 */

export interface DepartmentMemberFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return {
    edition_id: formData.get("edition_id"),
    profile_id: formData.get("profile_id"),
    department_id: formData.get("department_id"),
    title: formData.get("title") || "",
    order_index: formData.get("order_index") || 0,
  };
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

function revalidateAll() {
  revalidatePath("/admin/department-members");
  revalidatePath("/departments");
}

export async function createDepartmentMemberAction(
  _prev: DepartmentMemberFormState,
  formData: FormData
): Promise<DepartmentMemberFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const parsed = departmentMemberSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const dept = resolveWriteDepartmentId(admin, parsed.data.department_id);
  if (!dept.ok) return { error: dept.error };
  // department_members.department_id is `not null` — a department_admin
  // with no department is already caught above, and editor never reaches
  // this action (RLS requires admin+), so dept.departmentId is always a
  // real id here.

  const supabase = await createClient();
  const { error } = await supabase.from("department_members").insert({
    ...parsed.data,
    department_id: dept.departmentId as string,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "This person is already listed for that department and edition." };
    }
    console.error("createDepartmentMemberAction: insert failed", error);
    return { error: "Something went wrong saving this. Please try again." };
  }

  revalidateAll();
  redirect("/admin/department-members?toast=Member added");
}

export async function updateDepartmentMemberAction(
  id: string,
  _prev: DepartmentMemberFormState,
  formData: FormData
): Promise<DepartmentMemberFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const supabase = await createClient();

  if (admin.role === "department_admin") {
    const { data: existing, error: fetchError } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !existing) return { error: "That member could not be found." };
    if (!canWriteScopedRow(admin, (existing as { department_id: string | null }).department_id)) {
      return { error: "Not authorised: this member belongs to a different department." };
    }
  }

  const parsed = departmentMemberSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const dept = resolveWriteDepartmentId(admin, parsed.data.department_id);
  if (!dept.ok) return { error: dept.error };

  const { error } = await supabase
    .from("department_members")
    .update({ ...parsed.data, department_id: dept.departmentId as string })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "This person is already listed for that department and edition." };
    }
    console.error("updateDepartmentMemberAction: update failed", error);
    return { error: "Something went wrong saving this. Please try again." };
  }

  revalidateAll();
  redirect("/admin/department-members?toast=Member updated");
}

export async function deleteDepartmentMemberAction(id: string) {
  const admin = await requireAnyAdmin();

  if (!hasRole(admin, "admin") && admin.role !== "department_admin") {
    throw new Error("Not authorised: your account does not have permission for this action.");
  }

  const supabase = await createClient();

  if (admin.role === "department_admin") {
    const { data: existing, error: fetchError } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !existing) throw new Error("That member could not be found.");
    if (!canWriteScopedRow(admin, (existing as { department_id: string | null }).department_id)) {
      throw new Error("Not authorised: this member belongs to a different department.");
    }
  }

  const { error } = await supabase.from("department_members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAll();
  redirect("/admin/department-members?toast=Member removed");
}
