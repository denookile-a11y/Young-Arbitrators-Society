"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Soft unsubscribe — sets unsubscribed_at rather than deleting the row.
 *
 * This is the correct default: the schema carries an `unsubscribed_at`
 * column precisely so an unsubscribe is recorded rather than erased. Hard
 * deletion (the previous behaviour) destroyed the suppression record, so a
 * person who had opted out could be silently re-added by the public signup
 * form — the unique-email constraint no longer had a row to conflict with.
 */
export async function unsubscribeSubscriberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}

/** Re-subscribe someone who previously opted out. */
export async function resubscribeSubscriberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}

/**
 * Hard delete — kept as a separate, explicit action for genuine erasure
 * requests (e.g. a data-protection deletion request), not for ordinary
 * unsubscribes. Callers should prefer unsubscribeSubscriberAction.
 */
export async function deleteSubscriberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}
