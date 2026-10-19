import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, isServiceClientConfigured } from "@/lib/supabase/service";
import { enqueueEmails } from "@/lib/email/outbox";
import { emailBudgetState } from "@/lib/email/budget";
import { renderNewsletterConfirmEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";
import {
  CONFIRM_TTL_HOURS,
  decideSubscribe,
  evaluateConfirmation,
  type SubscriberState,
} from "./state";
import { CONFIRM_LINK_MARKER, deriveConfirmToken, generateConfirmNonce, getUnsubscribeSecret, hashToken } from "./tokens";

export type SubscribeOutcome =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "failed" | "busy" };

type IssueOutcome = "queued" | "failed" | "skipped";

/**
 * Issue a fresh single-use confirmation token for an EXISTING subscriber row,
 * queue the confirmation email, and record when it was queued. Shared by the
 * public sign-up and the operator re-consent request, so both use exactly the
 * same double opt-in mechanics. Never marks anyone confirmed.
 *
 * mode "public" (default): the person asked to subscribe themselves, so an
 *   earlier opt-out is deliberately lifted (they must still confirm).
 * mode "legacy": the OPERATOR is asking. This must never lift an opt-out and
 *   must never email the same person twice, so the row is CLAIMED with one
 *   conditional UPDATE (still pending, still not unsubscribed, never asked)
 *   that also stamps confirmation_sent_at. A concurrent run, a repeat click or
 *   an unsubscribe that landed after the preview all match zero rows and are
 *   reported as "skipped". If queueing then fails, the claim is released so the
 *   row stays eligible and a retry is safe.
 */
async function issueConfirmation(
  db: SupabaseClient,
  subscriber: { id: string; email: string },
  siteUrl: string,
  now: Date,
  mode: "public" | "legacy" = "public"
): Promise<IssueOutcome> {
  const secret = getUnsubscribeSecret();
  if (!secret) {
    console.error("newsletter: NEWSLETTER_TOKEN_SECRET is not configured; cannot issue a confirmation");
    return "failed";
  }
  // The link is never stored: the queued email carries only a nonce and the worker
  // derives the real token at delivery time (see tokens.ts and delivery.ts).
  const nonce = generateConfirmNonce();
  const token = deriveConfirmToken(subscriber.id, nonce, secret);
  const tokenHash = hashToken(token);
  const expires = new Date(now.getTime() + CONFIRM_TTL_HOURS * 3_600_000).toISOString();

  if (mode === "legacy") {
    const { data: claimed, error } = await db
      .from("newsletter_subscribers")
      .update({
        status: "pending",
        confirmed_at: null,
        confirm_token_hash: tokenHash,
        confirm_token_expires_at: expires,
        confirmation_sent_at: now.toISOString(),
      })
      .eq("id", subscriber.id)
      .eq("status", "pending")
      .is("unsubscribed_at", null)
      .is("confirmation_sent_at", null)
      .select("id");
    if (error) {
      console.error("newsletter: could not claim subscriber for re-consent", error.message);
      return "failed";
    }
    if (!claimed || claimed.length === 0) return "skipped";
  } else {
    const { error } = await db
      .from("newsletter_subscribers")
      .update({
        status: "pending",
        unsubscribed_at: null,
        confirmed_at: null,
        confirm_token_hash: tokenHash,
        confirm_token_expires_at: expires,
      })
      .eq("id", subscriber.id);
    if (error) {
      console.error("newsletter: could not store confirmation token", error.message);
      return "failed";
    }
  }

  const mail = renderNewsletterConfirmEmail({
    confirmUrl: `${CONFIRM_LINK_MARKER}${nonce}`,
    hoursValid: CONFIRM_TTL_HOURS,
  });
  const queued = await enqueueEmails(
    [
      {
        kind: "newsletter_confirm",
        // The token hash makes each issued link its own logical email.
        dedupeKey: `nl-confirm:${subscriber.id}:${tokenHash.slice(0, 16)}`,
        to: subscriber.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      },
    ],
    db
  );
  if (!queued.ok) {
    console.error("newsletter: could not queue confirmation", queued.error);
    if (mode === "legacy") {
      // Release the claim (only if it is still ours) so the row stays eligible for a retry.
      const { error: releaseError } = await db
        .from("newsletter_subscribers")
        .update({ confirmation_sent_at: null, confirm_token_hash: null, confirm_token_expires_at: null })
        .eq("id", subscriber.id)
        .eq("confirm_token_hash", tokenHash);
      if (releaseError) console.error("newsletter: could not release re-consent claim", releaseError.message);
    }
    return "failed";
  }
  if (mode === "public") {
    const { error } = await db
      .from("newsletter_subscribers")
      .update({ confirmation_sent_at: now.toISOString() })
      .eq("id", subscriber.id);
    if (error) console.error("newsletter: could not record confirmation time", error.message);
  }
  return "queued";
}

/**
 * Public signup → pending subscriber + confirmation email (queued).
 * The caller shows the SAME message for every ok:true outcome, so the form
 * cannot be used to learn whether an address is already subscribed.
 * Delivery itself is attempted by the caller after the response (see action).
 */
export async function subscribeToNewsletter(rawEmail: string, source: string): Promise<SubscribeOutcome> {
  const siteUrl = getSiteUrl();
  if (!isServiceClientConfigured() || !siteUrl) {
    // The visitor only ever sees "temporarily unavailable". The operator needs to know
    // WHY, so log which settings are missing (names only - never values).
    const missing = [
      !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
      !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
      !siteUrl && "NEXT_PUBLIC_SITE_URL (must be a real http(s) address, not the placeholder)",
    ].filter(Boolean);
    console.error("newsletter sign-up unavailable - missing server configuration:", missing.join(", "));
    return { ok: false, reason: "not_configured" };
  }

  const email = rawEmail.trim().toLowerCase();
  const db = createServiceClient();
  const now = new Date();

  const { data: existing, error: lookupError } = await db
    .from("newsletter_subscribers")
    .select("id, status, unsubscribed_at, confirmation_sent_at")
    .eq("email", email)
    .maybeSingle<SubscriberState & { id: string }>();
  if (lookupError) {
    console.error("newsletter subscribe: lookup failed", lookupError.message);
    return { ok: false, reason: "failed" };
  }

  const decision = decideSubscribe(existing, now);
  if (decision.type === "already_confirmed" || decision.type === "cooldown") return { ok: true };

  // Global hourly ceiling on confirmation emails (holds across instances).
  const budget = await emailBudgetState("newsletter_confirm", db, now);
  if (budget === "exhausted") return { ok: false, reason: "busy" };
  if (budget === "error") return { ok: false, reason: "failed" }; // cause already logged (e.g. email_outbox missing: apply migration 007)

  let subscriber: { id: string; email: string };
  if (decision.type === "create") {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .insert({ email, source, status: "pending" })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) {
      // A concurrent signup for the same address won the unique constraint:
      // that request is already sending the confirmation. Not a failure.
      if (error?.code === "23505") return { ok: true };
      console.error("newsletter subscribe: insert failed", error?.message);
      return { ok: false, reason: "failed" };
    }
    subscriber = { id: data.id, email };
  } else {
    subscriber = { id: existing!.id, email };
  }

  return (await issueConfirmation(db, subscriber, siteUrl, now)) === "queued" ? { ok: true } : { ok: false, reason: "failed" };
}

export type ConfirmResult = "confirmed" | "expired" | "invalid" | "error";

/** Single-use: the UPDATE matches on the token hash and clears it atomically. */
export async function confirmSubscription(token: string): Promise<ConfirmResult> {
  if (!isServiceClientConfigured() || !token || token.length > 200) return "invalid";
  const db = createServiceClient();
  const now = new Date();
  const tokenHash = hashToken(token);

  const { data: row, error } = await db
    .from("newsletter_subscribers")
    .select("status, confirm_token_expires_at")
    .eq("confirm_token_hash", tokenHash)
    .maybeSingle<{ status: "pending" | "confirmed" | "unsubscribed"; confirm_token_expires_at: string | null }>();
  if (error) {
    console.error("newsletter confirm: lookup failed", error.message);
    return "error";
  }
  const verdict = evaluateConfirmation(row, now);
  if (verdict !== "confirmed") return verdict;

  const { data: updated, error: updateError } = await db
    .from("newsletter_subscribers")
    .update({
      status: "confirmed",
      confirmed_at: now.toISOString(),
      unsubscribed_at: null,
      confirm_token_hash: null,
      confirm_token_expires_at: null,
    })
    .eq("confirm_token_hash", tokenHash) // already-used token matches nothing
    .gt("confirm_token_expires_at", now.toISOString())
    .select("id");
  if (updateError) {
    console.error("newsletter confirm: update failed", updateError.message);
    return "error";
  }
  return updated && updated.length > 0 ? "confirmed" : "invalid";
}

/** Idempotent. Records the opt-out as a status, never deletes the row. */
export async function unsubscribeSubscriber(subscriberId: string): Promise<boolean> {
  if (!isServiceClientConfigured()) return false;
  const { error } = await createServiceClient()
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      confirm_token_hash: null,
      confirm_token_expires_at: null,
    })
    .eq("id", subscriberId);
  if (error) console.error("newsletter unsubscribe: update failed", error.message);
  return !error;
}

export interface ConsentSummary {
  confirmed: number;
  /** Pending and never sent a confirmation: the legacy list-import population. */
  legacyUnconfirmed: number;
  pendingAwaitingConfirmation: number;
  unsubscribed: number;
}

export async function getConsentSummary(): Promise<ConsentSummary> {
  const db = createServiceClient();
  const count = async (build: (q: ReturnType<typeof base>) => unknown) => {
    const q = build(base());
    const { count: c, error } = (await q) as { count: number | null; error: { message: string } | null };
    if (error) throw new Error(error.message);
    return c ?? 0;
  };
  const base = () => db.from("newsletter_subscribers").select("id", { count: "exact", head: true });
  return {
    confirmed: await count((q) => q.eq("status", "confirmed")),
    legacyUnconfirmed: await count((q) => q.eq("status", "pending").is("confirmation_sent_at", null).is("unsubscribed_at", null)),
    pendingAwaitingConfirmation: await count((q) => q.eq("status", "pending").not("confirmation_sent_at", "is", null)),
    unsubscribed: await count((q) => q.eq("status", "unsubscribed")),
  };
}

export interface ReconsentResult {
  /** Legacy subscribers found for THIS batch (bounded by `limit`), not the whole list. */
  eligible: number;
  /** Confirmation emails queued in this call (0 on a dry run). */
  queued: number;
  /** Found in the batch but no longer eligible when reached (claimed by another run, unsubscribed, or confirmed since). Nobody was emailed. */
  skipped: number;
  /** Queueing or database failures. The claim was released, so these remain eligible for a retry. */
  failed: number;
  stoppedBy: "none" | "limit" | "budget" | "error" | "not_configured";
}

/**
 * Ask LEGACY subscribers (imported before consent was recorded) to confirm.
 * Safety properties:
 *  - DRY RUN BY DEFAULT: with `execute` false it only counts.
 *  - It only ever sends the standard confirmation email; nobody is confirmed
 *    and no announcement/campaign content is sent.
 *  - Unsubscribed addresses are never contacted, and an opt-out is never
 *    cleared to make someone eligible (see issueConfirmation, mode "legacy").
 *  - Each row is claimed atomically before anything is queued, so concurrent
 *    or repeated runs cannot email the same person twice.
 *  - Bounded per call (`limit`) and by the hourly confirmation budget, so a
 *    large list is worked through in batches; re-running continues where it
 *    stopped because claimed rows have confirmation_sent_at set.
 *  - A failure stops the batch (no hammering a broken queue); the failed row's
 *    claim is released so it is retried on the next run.
 */
export async function requestLegacyReconsent(opts: { execute: boolean; limit?: number }): Promise<ReconsentResult> {
  const siteUrl = getSiteUrl();
  if (!isServiceClientConfigured() || !siteUrl || !getUnsubscribeSecret()) {
    return { eligible: 0, queued: 0, skipped: 0, failed: 0, stoppedBy: "not_configured" };
  }
  const db = createServiceClient();
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50) || 50, 1), 100);

  const { data, error } = await db
    .from("newsletter_subscribers")
    .select("id, email")
    .eq("status", "pending")
    .is("confirmation_sent_at", null)
    .is("unsubscribed_at", null)
    .order("subscribed_at", { ascending: true })
    .limit(limit)
    .returns<{ id: string; email: string }[]>();
  if (error) {
    console.error("reconsent: select failed", error.message);
    return { eligible: 0, queued: 0, skipped: 0, failed: 0, stoppedBy: "error" };
  }
  const rows = data ?? [];
  if (!opts.execute) return { eligible: rows.length, queued: 0, skipped: 0, failed: 0, stoppedBy: "none" };

  const now = new Date();
  let queued = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    if ((await emailBudgetState("newsletter_confirm", db, now)) !== "ok") {
      return { eligible: rows.length, queued, skipped, failed, stoppedBy: "budget" };
    }
    const outcome = await issueConfirmation(db, row, siteUrl, now, "legacy");
    if (outcome === "queued") queued += 1;
    else if (outcome === "skipped") skipped += 1;
    else {
      failed += 1;
      return { eligible: rows.length, queued, skipped, failed, stoppedBy: "error" };
    }
  }
  return { eligible: rows.length, queued, skipped, failed, stoppedBy: rows.length >= limit ? "limit" : "none" };
}
