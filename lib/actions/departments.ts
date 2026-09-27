"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin, checkAnyAdmin } from "@/lib/auth/require-admin";
import { canWriteOwnDepartment } from "@/lib/auth/department-scope";
import { departmentSchema } from "@/lib/validation/content";

export interface DepartmentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return departmentSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline") || undefined,
    mandate: formData.get("mandate") || undefined,
    status: formData.get("status"),
    order_index: formData.get("order_index") || 0,
  });
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

export async function createDepartmentAction(
  _prev: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const authError = await checkAdmin("admin");
  if (authError) return { error: authError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  redirect("/admin/departments?toast=Department created");
}

export async function updateDepartmentAction(
  id: string,
  _prev: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  // Note: departments has no insert/delete policy for department_admin at
  // all (see supabase/migrations/002_people_structure.sql) — only this
  // update path is scoped to them, and only for their own department. The
  // row's own `id` (not a department_id column — this table doesn't have
  // one, since a department IS the department) establishes ownership.
  if (!canWriteOwnDepartment(admin, id)) {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").update(parsed.data).eq("id", id);
  if (error) {
    console.error("updateDepartmentAction: update failed", error);
    return { error: "Something went wrong saving this department. Please try again." };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  revalidatePath(`/departments/${parsed.data.slug}`);
  redirect("/admin/departments?toast=Department updated");
}

export async function deleteDepartmentAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/departments");
  revalidatePath("/departments");
  redirect("/admin/departments?toast=Department deleted");
}
