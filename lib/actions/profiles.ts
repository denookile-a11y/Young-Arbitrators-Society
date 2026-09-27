"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";
import { profileSchema } from "@/lib/validation/content";

export interface ProfileFormState {
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
  return profileSchema.safeParse({
    slug: formData.get("slug"),
    full_name: formData.get("full_name"),
    portrait_url: formData.get("portrait_url") || "",
    bio: formData.get("bio") || undefined,
    email: formData.get("email") || "",
    linkedin_url: formData.get("linkedin_url") || "",
    twitter_url: formData.get("twitter_url") || "",
    status: formData.get("status"),
  });
}

export async function createProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership/people?toast=Person added");
}

export async function updateProfileAction(
  id: string,
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership/people?toast=Person updated");
}

export async function deleteProfileAction(id: string) {
  await requireAdmin("editor");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leadership");
  revalidatePath("/leadership");
  redirect("/admin/leadership/people?toast=Person deleted");
}
