"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";

const speakerSchema = z.object({
  conference_id: z.string().uuid(),
  display_name: z.string().min(1, "Name is required"),
  role_title: z.string().optional(),
  organisation: z.string().optional(),
  photo_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  order_index: z.coerce.number().int().default(0),
});

export interface SpeakerFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function addConferenceSpeakerAction(
  conferenceId: string,
  _prev: SpeakerFormState,
  formData: FormData
): Promise<SpeakerFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = speakerSchema.safeParse({
    conference_id: conferenceId,
    display_name: formData.get("display_name"),
    role_title: formData.get("role_title") || undefined,
    organisation: formData.get("organisation") || undefined,
    photo_url: formData.get("photo_url") || "",
    order_index: formData.get("order_index") || 0,
  });
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") out[key] = issue.message;
    }
    return { fieldErrors: out };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("conference_speakers").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath(`/admin/conferences/${conferenceId}`);
  revalidatePath("/conferences");
  return {};
}

export async function deleteConferenceSpeakerAction(speakerId: string, conferenceId: string) {
  await requireAdmin("editor");

  const supabase = await createClient();
  const { error } = await supabase.from("conference_speakers").delete().eq("id", speakerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/conferences/${conferenceId}`);
  revalidatePath("/conferences");
}
