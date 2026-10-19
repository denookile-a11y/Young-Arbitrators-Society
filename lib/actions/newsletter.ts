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
    // `status` is authoritative for email eligibility (see lib/newsletter/state.ts);
    // unsubscribed_at is kept in step so the two can never disagree.
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      confirm_token_hash: null,
      confirm_token_expires_at: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}

/**
 * Lift an opt-out. An administrator cannot grant consent on someone's behalf,
 * so this returns the person to PENDING (they receive nothing until they
 * confirm by email) — it never marks them confirmed.
 */
export async function resubscribeSubscriberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "pending",
      unsubscribed_at: null,
      confirmed_at: null,
      confirm_token_hash: null,
      confirm_token_expires_at: null,
      confirmation_sent_at: null,
    })
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
