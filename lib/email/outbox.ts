import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, isServiceClientConfigured } from "@/lib/supabase/service";
import { getEmailSender, type EmailSender } from "./provider";
import { createNewsletterDeliveryGuard, type DeliveryDecision } from "@/lib/newsletter/delivery";

export type OutboxKind = "contact" | "newsletter_confirm" | "announcement";

export interface OutboxRow {
  id: string;
  kind: OutboxKind;
  dedupe_key: string;
  to_email: string;
  reply_to: string | null;
  subject: string;
  text_body: string;
  html_body: string | null;
  headers: Record<string, string>;
  attempts: number;
}

export interface NewOutboxEmail {
  kind: OutboxKind;
  dedupeKey: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export const MAX_ATTEMPTS = 5;
const LEASE_MS = 10 * 60_000;

/** 1m, 5m, 25m, 2h — capped so a long outage is retried, not abandoned. */
export function backoffMs(attempts: number): number {
  return Math.min(60_000 * 5 ** Math.max(0, attempts - 1), 2 * 60 * 60_000);
}

export interface OutboxStore {
  /** Atomically claim up to `limit` due rows (lease them) and return them. */
  claimDue(limit: number, now: Date): Promise<OutboxRow[]>;
  markSent(id: string, providerId: string | null, now: Date): Promise<void>;
  markFailed(
    id: string,
    update: { status: "failed" | "dead"; error: string; nextAttemptAt: Date }
  ): Promise<void>;
}

export interface BatchResult {
  claimed: number;
  sent: number;
  retrying: number;
  dead: number;
  /** Rows deliberately not sent at delivery time (opted out, superseded, expired). Counted within `dead`. */
  suppressed: number;
}

/**
 * Deliver due emails. Pure orchestration over an injected store + sender so
 * the retry/duplicate rules are testable without a database or a provider.
 *
 * Duplicate safety: (1) dedupe_key is unique, so one logical email is one
 * row; (2) a row is claimed by an optimistic attempts-check, so two
 * concurrent runs cannot both send it; (3) the outbox id is the provider
 * Idempotency-Key, so even a crash between "provider accepted" and
 * "markSent" cannot produce a second email on retry.
 */
export async function processOutboxBatch(opts: {
  store: OutboxStore;
  send: EmailSender;
  now?: Date;
  limit?: number;
  maxAttempts?: number;
  /** Last-moment check run on each claimed row before the provider is called. */
  prepare?: (row: OutboxRow) => Promise<DeliveryDecision>;
}): Promise<BatchResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const rows = await opts.store.claimDue(opts.limit ?? 25, now);
  const result: BatchResult = { claimed: rows.length, sent: 0, retrying: 0, dead: 0, suppressed: 0 };

  for (const claimed of rows) {
    let row = claimed;
    if (opts.prepare) {
      let decision: DeliveryDecision;
      try {
        decision = await opts.prepare(claimed);
      } catch {
        decision = { send: false, retry: true, reason: "delivery check failed" };
      }
      if (!decision.send) {
        const exhausted = !decision.retry || claimed.attempts >= maxAttempts;
        await opts.store.markFailed(claimed.id, {
          status: exhausted ? "dead" : "failed",
          error: decision.reason.slice(0, 500),
          nextAttemptAt: new Date(now.getTime() + backoffMs(claimed.attempts)),
        });
        if (exhausted) result.dead += 1;
        else result.retrying += 1;
        if (!decision.retry) result.suppressed += 1;
        continue;
      }
      row = decision.row;
    }
    const outcome = await opts.send({
      to: row.to_email,
      subject: row.subject,
      text: row.text_body,
      html: row.html_body ?? undefined,
      replyTo: row.reply_to ?? undefined,
      headers: row.headers,
      idempotencyKey: row.id,
    });

    if (outcome.ok) {
      await opts.store.markSent(row.id, outcome.id, now);
      result.sent += 1;
      continue;
    }
    const exhausted = !outcome.retryable || row.attempts >= maxAttempts;
    await opts.store.markFailed(row.id, {
      status: exhausted ? "dead" : "failed",
      error: outcome.error.slice(0, 500),
      nextAttemptAt: new Date(now.getTime() + backoffMs(row.attempts)),
    });
    if (exhausted) result.dead += 1;
    else result.retrying += 1;
  }
  return result;
}

export function supabaseOutboxStore(client: SupabaseClient): OutboxStore {
  const columns =
    "id, kind, dedupe_key, to_email, reply_to, subject, text_body, html_body, headers, attempts";
  return {
    async claimDue(limit, now) {
      const { data, error } = await client
        .from("email_outbox")
        .select(columns)
        .in("status", ["pending", "failed", "sending"]) // 'sending' = expired lease
        .lte("next_attempt_at", now.toISOString())
        .order("created_at", { ascending: true })
        .limit(limit)
        .returns<OutboxRow[]>();
      if (error) throw new Error(`outbox select failed: ${error.message}`);

      const claimed: OutboxRow[] = [];
      for (const row of data ?? []) {
        const { data: won, error: claimError } = await client
          .from("email_outbox")
          .update({
            status: "sending",
            attempts: row.attempts + 1,
            next_attempt_at: new Date(now.getTime() + LEASE_MS).toISOString(),
          })
          .eq("id", row.id)
          .eq("attempts", row.attempts) // optimistic lock: only one runner wins
          .in("status", ["pending", "failed", "sending"]) // never re-claim a sent/dead job
          .select("id")
          .maybeSingle();
        if (claimError) throw new Error(`outbox claim failed: ${claimError.message}`);
        if (won) claimed.push({ ...row, attempts: row.attempts + 1 });
      }
      return claimed;
    },
    async markSent(id, providerId, now) {
      const { error } = await client
        .from("email_outbox")
        .update({ status: "sent", sent_at: now.toISOString(), provider_message_id: providerId, last_error: null })
        .eq("id", id);
      if (error) throw new Error(`outbox markSent failed: ${error.message}`);
    },
    async markFailed(id, update) {
      const { error } = await client
        .from("email_outbox")
        .update({
          status: update.status,
          last_error: update.error,
          next_attempt_at: update.nextAttemptAt.toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(`outbox markFailed failed: ${error.message}`);
    },
  };
}

export type EnqueueResult =
  | { ok: true; inserted: number; duplicates: number }
  | { ok: false; error: string };

/**
 * Queue emails idempotently. Re-enqueueing an existing dedupe_key is a
 * no-op (ON CONFLICT DO NOTHING), never an error and never a second row.
 */
export async function enqueueEmails(
  emails: NewOutboxEmail[],
  client?: SupabaseClient
): Promise<EnqueueResult> {
  if (emails.length === 0) return { ok: true, inserted: 0, duplicates: 0 };
  if (!client && !isServiceClientConfigured()) {
    return { ok: false, error: "Email queue is not configured (service role key missing)." };
  }
  const db = client ?? createServiceClient();
  const rows = emails.map((e) => ({
    kind: e.kind,
    dedupe_key: e.dedupeKey,
    to_email: e.to,
    reply_to: e.replyTo ?? null,
    subject: e.subject,
    text_body: e.text,
    html_body: e.html ?? null,
    headers: e.headers ?? {},
  }));
  const { data, error } = await db
    .from("email_outbox")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) return { ok: false, error: error.message };
  const inserted = data?.length ?? 0;
  return { ok: true, inserted, duplicates: rows.length - inserted };
}

/** Production entry point: service client + configured provider. */
export async function processOutbox(limit = 25): Promise<BatchResult | { skipped: string }> {
  const send = getEmailSender();
  if (!send) return { skipped: "Email provider is not configured." };
  if (!isServiceClientConfigured()) return { skipped: "Service role key is not configured." };
  const db = createServiceClient();
  return processOutboxBatch({ store: supabaseOutboxStore(db), send, limit, prepare: createNewsletterDeliveryGuard(db) });
}
