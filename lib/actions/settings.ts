"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";
import { settingsSchema } from "@/lib/validation/settings";
import { SITE_SETTINGS_TAG } from "@/lib/queries/public-settings";

export interface SettingsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function updateSiteSettingsAction(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  // Explicit application-level guard (v10): refuse before touching the
  // database rather than relying on RLS alone.
  const authError = await checkAdmin("super_admin");
  if (authError) return { error: authError };

  // Server-side validation/normalisation. Every field is always submitted
  // by the form, so an empty optional field now means "clear it" (the old
  // code silently dropped empty values, so a value could never be removed).
  const parsed = settingsSchema.safeParse({
    site_title: formData.get("site_title") ?? "",
    contact_email: formData.get("contact_email") ?? "",
    instagram_handle: formData.get("instagram_handle") ?? "",
    linkedin_url: formData.get("linkedin_url") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value,
    updated_by: user?.id ?? null,
  }));

  // .select() returns the rows that were actually written. Without it a
  // write that RLS filtered to zero rows looks identical to success.
  const { data: written, error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })
    .select("key");
  if (error) {
    console.error("updateSiteSettingsAction: upsert failed", error);
    return { error: "Something went wrong saving settings. Please try again." };
  }
  if (!written || written.length !== rows.length) {
    console.error(
      `updateSiteSettingsAction: expected ${rows.length} rows written, got ${written?.length ?? 0}`
    );
    return { error: "Settings could not be saved (permission or database problem). Nothing was changed." };
  }

  // Public pages read these through a tagged cache and render them in the
  // footer of every page, so invalidate the tag and the whole layout tree.
  updateTag(SITE_SETTINGS_TAG);
  revalidateTag(SITE_SETTINGS_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true };
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
