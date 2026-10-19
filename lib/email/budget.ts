import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, isServiceClientConfigured } from "@/lib/supabase/service";
import type { OutboxKind } from "./outbox";

/**
 * Database-backed ceilings on how much PUBLIC-triggered email we will queue per
 * hour. The in-memory per-IP limiter (lib/rate-limit.ts) is per serverless
 * instance, so an attacker spread across instances/IPs can exceed it. These
 * caps count rows in email_outbox, so they hold across every instance, and
 * they bound the real harm: burning the provider quota/reputation or using
 * the confirmation form to email third parties.
 *
 * The trade-off is that a flood can use up the budget for legitimate people
 * until the window passes; the caps are generous for a student society and a
 * refusal is a clear, temporary message (never data loss — contact messages
 * are stored regardless).
 */
export const EMAIL_BUDGETS: Partial<Record<OutboxKind, { max: number; windowMs: number }>> = {
  newsletter_confirm: { max: 100, windowMs: 3_600_000 },
  contact: { max: 30, windowMs: 3_600_000 },
};

export type BudgetState = "ok" | "exhausted" | "error";

/** Distinguishes "the hourly cap is reached" from "we could not count at all". */
export async function emailBudgetState(
  kind: OutboxKind,
  client?: SupabaseClient,
  now: Date = new Date()
): Promise<BudgetState> {
  const budget = EMAIL_BUDGETS[kind];
  if (!budget) return "ok";
  if (!client && !isServiceClientConfigured()) return "error";
  const db = client ?? createServiceClient();
  const since = new Date(now.getTime() - budget.windowMs).toISOString();
  const { count, error } = await db
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) {
    console.error("email budget check failed", error.message);
    return "error";
  }
  return (count ?? 0) < budget.max ? "ok" : "exhausted";
}

/** true = there is budget left. Fails CLOSED: if we cannot count, do not send. */
export async function withinEmailBudget(
  kind: OutboxKind,
  client?: SupabaseClient,
  now: Date = new Date()
): Promise<boolean> {
  return (await emailBudgetState(kind, client, now)) === "ok";
}
