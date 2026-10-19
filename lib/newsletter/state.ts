export const CONFIRM_TTL_HOURS = 48;
export const RESEND_COOLDOWN_MS = 10 * 60_000;

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export interface SubscriberState {
  status: SubscriberStatus;
  unsubscribed_at: string | null;
  confirmation_sent_at: string | null;
}

export type SubscribeDecision =
  | { type: "create" }
  | { type: "send_confirmation"; reason: "pending" | "resubscribe" }
  | { type: "cooldown" }
  | { type: "already_confirmed" };

/**
 * What a public signup should do for an email, given what we already know.
 * Never marks anyone confirmed; never emails a confirmed address; never
 * re-sends to a pending address faster than the cooldown.
 */
export function decideSubscribe(existing: SubscriberState | null, now: Date): SubscribeDecision {
  if (!existing) return { type: "create" };
  if (existing.status === "confirmed" && !existing.unsubscribed_at) return { type: "already_confirmed" };
  if (existing.status === "unsubscribed" || existing.unsubscribed_at) {
    // Opting back in needs a fresh confirmation — old consent is withdrawn.
    return { type: "send_confirmation", reason: "resubscribe" };
  }
  const last = existing.confirmation_sent_at ? Date.parse(existing.confirmation_sent_at) : 0;
  if (now.getTime() - last < RESEND_COOLDOWN_MS) return { type: "cooldown" };
  return { type: "send_confirmation", reason: "pending" };
}

export type ConfirmOutcome = "confirmed" | "expired" | "invalid";

/** Decide a confirmation attempt from the row the token hash resolved to. */
export function evaluateConfirmation(
  row: { status: SubscriberStatus; confirm_token_expires_at: string | null } | null,
  now: Date
): ConfirmOutcome {
  if (!row || row.status === "confirmed") return "invalid"; // unknown or already-used token
  if (!row.confirm_token_expires_at || Date.parse(row.confirm_token_expires_at) <= now.getTime()) {
    return "expired";
  }
  return "confirmed";
}

/** The only gate for bulk/announcement email. */
export function isEligibleForAnnouncements(row: {
  status: SubscriberStatus;
  unsubscribed_at: string | null;
}): boolean {
  return row.status === "confirmed" && row.unsubscribed_at === null;
}
