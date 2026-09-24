"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/auth/require-admin";
import { programmeSchema } from "@/lib/validation/content";
import type { ProgrammeItem } from "@/types/database";

export interface ProgrammeFormState {
  error?: string;
  success?: boolean;
}

/**
 * Persists the full ordered session list to conferences.programme in one
 * write. The whole array round-trips through this action rather than a
 * per-session sub-form (unlike moot_documents/conference_speakers, which
 * are real child rows) because programme is a JSONB column, not a related
 * table — there's nothing to key an individual row update against, so the
 * UI manages the array client-side and this action replaces it wholesale
 * on save. This matches the existing schema exactly: no DB change.
 */
export async function saveConferenceProgrammeAction(
  conferenceId: string,
  sessions: ProgrammeItem[]
): Promise<ProgrammeFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = programmeSchema.safeParse(sessions);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid programme data." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("conferences")
    .update({ programme: parsed.data })
    .eq("id", conferenceId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/conferences/${conferenceId}`);
  revalidatePath("/conferences");
  return { success: true };
}
