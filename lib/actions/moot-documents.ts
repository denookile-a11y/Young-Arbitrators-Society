"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";

const mootDocumentSchema = z.object({
  moot_id: z.string().uuid(),
  kind: z.enum(["problem", "procedural_order", "authorities", "memorial", "schedule", "results", "report", "other"]),
  title: z.string().min(1, "Title is required"),
  file_url: z.string().url("Enter a valid file URL"),
  order_index: z.coerce.number().int().default(0),
});

export interface MootDocumentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function addMootDocumentAction(
  mootId: string,
  _prev: MootDocumentFormState,
  formData: FormData
): Promise<MootDocumentFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = mootDocumentSchema.safeParse({
    moot_id: mootId,
    kind: formData.get("kind"),
    title: formData.get("title"),
    file_url: formData.get("file_url"),
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
  const { error } = await supabase.from("moot_documents").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath(`/admin/moot/${mootId}`);
  revalidatePath("/moot");
  return {};
}

export async function deleteMootDocumentAction(documentId: string, mootId: string) {
  await requireAdmin("editor");

  const supabase = await createClient();
  const { error } = await supabase.from("moot_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/moot/${mootId}`);
  revalidatePath("/moot");
}
