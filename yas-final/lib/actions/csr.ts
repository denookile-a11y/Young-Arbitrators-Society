"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAnyAdmin } from "@/lib/auth/require-admin";
import { canManageCsr } from "@/lib/auth/department-scope";
import { csrProjectSchema } from "@/lib/validation/content";
import type { GenericFormState } from "./make-content-actions";
import type { Admin } from "@/types/database";

/**
 * csr_projects is department-admin-writable, but — unlike publications and
 * leadership_roles — the table has no department_id column at all (see
 * supabase/migrations/003_content.sql). RLS instead grants access to a
 * department_admin only when their OWN department is the one whose slug
 * is "csr": `current_admin_department() = (select id from departments
 * where slug = 'csr')`. There is nothing to assign per-project, so this
 * doesn't reuse runScopedCreate/runScopedUpdate (which exist specifically
 * to force/verify a department_id column) — it needs its own, smaller
 * check: resolve the "csr" department's id, then hand it to the same pure
 * canManageCsr() decision function used in lib/auth/department-scope.ts
 * (and unit-tested there).
 */
/**
 * Exported so admin-facing pages can decide what to show (New Project
 * button, per-row Publish/Archive/Feature/Delete) without duplicating the
 * lookup — same authorization decision the actions above enforce, just
 * exposed as a plain boolean for UI use. Backend actions never rely on
 * this alone; they call authorizeCsrWrite themselves.
 */
export async function canManageCsrProjects(admin: Admin): Promise<boolean> {
  const supabase = await createClient();
  return (await authorizeCsrWrite(supabase, admin)) === null;
}

async function authorizeCsrWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: Admin
): Promise<string | null> {
  const { data } = await supabase.from("departments").select("id").eq("slug", "csr").maybeSingle();
  const csrDepartmentId = (data as { id: string } | null)?.id ?? null;
  if (!canManageCsr(admin, csrDepartmentId)) {
    return "Not authorised: your account does not have permission for this action.";
  }
  return null;
}

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    partner_org: formData.get("partner_org") || undefined,
    cover_image_url: formData.get("cover_image_url") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
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

export async function createCsrProjectAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  const supabase = await createClient();
  const authError = await authorizeCsrWrite(supabase, admin);
  if (authError) return { error: authError };

  const parsed = csrProjectSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const { error } = await supabase.from("csr_projects").insert(parsed.data);
  if (error) {
    console.error("createCsrProjectAction: insert failed", error);
    return { error: "Something went wrong saving this project. Please try again." };
  }

  revalidatePath("/admin/csr");
  revalidatePath("/csr");
  redirect("/admin/csr?toast=Created successfully");
}

export async function updateCsrProjectAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  const supabase = await createClient();
  const authError = await authorizeCsrWrite(supabase, admin);
  if (authError) return { error: authError };

  const parsed = csrProjectSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const { error } = await supabase.from("csr_projects").update(parsed.data).eq("id", id);
  if (error) {
    console.error("updateCsrProjectAction: update failed", error);
    return { error: "Something went wrong saving this project. Please try again." };
  }

  revalidatePath("/admin/csr");
  revalidatePath("/csr");
  revalidatePath(`/csr/${parsed.data.slug}`);
  redirect("/admin/csr?toast=Updated successfully");
}
