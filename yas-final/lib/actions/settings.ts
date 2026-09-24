"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";

const SETTINGS_KEYS = ["site_title", "contact_email", "instagram_handle", "linkedin_url"] as const;

export interface SettingsFormState {
  error?: string;
}

export async function updateSiteSettingsAction(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  // SECURITY FIX (v10): this action previously performed the upsert with no
  // application-level authorization check at all — it relied entirely on
  // RLS to reject a non-super_admin caller. Restore the explicit guard so
  // an unauthorized caller is refused before the database is touched, with
  // a clean message instead of relying on a silent RLS no-op.
  const authError = await checkAdmin("super_admin");
  if (authError) return { error: authError };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const upserts = SETTINGS_KEYS.map((key) => ({
    key,
    value: formData.get(key) ?? "",
    updated_by: user?.id ?? null,
  })).filter((row) => row.value !== "");

  if (upserts.length === 0) return {};

  const { error } = await supabase.from("site_settings").upsert(upserts, { onConflict: "key" });
  if (error) {
    // SECURITY FIX (v10): never return the raw Postgres/Supabase error
    // message to the browser — it can leak schema/constraint details.
    // Log it server-side for diagnostics and return a generic message.
    console.error("updateSiteSettingsAction: upsert failed", error);
    return { error: "Something went wrong saving settings. Please try again." };
  }

  revalidatePath("/admin/settings");
  return {};
}

export async function updateAdminRoleAction(adminId: string, role: string) {
  // Defense-in-depth: RLS ("super_admin manages admins") already restricts
  // this update to super_admin, so a non-super_admin caller would silently
  // affect zero rows. This guard fails loudly and early instead, and keeps
  // the pattern consistent with every other mutating action in the app.
  await requireAdmin("super_admin");
  const supabase = await createClient();
  const { error } = await supabase.from("admins").update({ role }).eq("id", adminId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}

export async function deactivateAdminAction(adminId: string) {
  await requireAdmin("super_admin");
  const supabase = await createClient();
  const { error } = await supabase.from("admins").update({ is_active: false }).eq("id", adminId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
