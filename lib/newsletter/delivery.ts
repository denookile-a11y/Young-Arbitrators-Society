import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutboxRow } from "@/lib/email/outbox";
import { getSiteUrl } from "@/lib/site-url";
import { CONFIRM_LINK_RE, deriveConfirmToken, getUnsubscribeSecret, hashToken } from "./tokens";

/**
 * Delivery-time guard for newsletter mail. It runs inside the outbox worker for
 * every claimed row, immediately before the provider is called, so an opt-out or a
 * superseded confirmation that happens AFTER an email was queued is still honoured.
 *
 *  - contact mail: not a newsletter message; passes through unchanged.
 *  - newsletter_confirm: the subscriber must still exist, still be pending and not
 *    unsubscribed, and the queued nonce must still derive the token whose hash is
 *    on the row and which has not expired. The real confirmation link is built
 *    here and exists only in memory and in the message sent to the provider.
 *  - announcement: the subscriber must still be confirmed and not unsubscribed.
 *
 * Suppression is final ("dead", never retried). A temporary problem (database read
 * failure, secret or site address missing) is retried with the usual backoff and
 * nothing is sent in the meantime.
 */
export type DeliveryDecision =
  | { send: true; row: OutboxRow }
  | { send: false; retry: boolean; reason: string };

/** Keys are `nl-confirm:<subscriberId>:<tokenHash16>` and `announcement:<announcementId>:<subscriberId>`. */
function subscriberIdOf(row: OutboxRow): string | null {
  const parts = row.dedupe_key.split(":");
  const id = row.kind === "newsletter_confirm" ? (parts[0] === "nl-confirm" ? parts[1] : "") : parts[0] === "announcement" ? parts[2] : "";
  return id && parts.length === 3 ? id : null;
}
const suppress = (reason: string): DeliveryDecision => ({ send: false, retry: false, reason });
const later = (reason: string): DeliveryDecision => ({ send: false, retry: true, reason });

export function createNewsletterDeliveryGuard(
  db: SupabaseClient,
  opts: { now?: () => Date; siteUrl?: string | null; secret?: string | null } = {}
) {
  return async function prepareDelivery(row: OutboxRow): Promise<DeliveryDecision> {
    if (row.kind !== "newsletter_confirm" && row.kind !== "announcement") return { send: true, row };

    const subscriberId = subscriberIdOf(row);
    if (!subscriberId) return suppress("suppressed: unreadable subscriber reference");

    const { data: sub, error } = await db
      .from("newsletter_subscribers")
      .select("id, email, status, unsubscribed_at, confirm_token_hash, confirm_token_expires_at")
      .eq("id", subscriberId)
      .maybeSingle<{
        id: string;
        email: string;
        status: string;
        unsubscribed_at: string | null;
        confirm_token_hash: string | null;
        confirm_token_expires_at: string | null;
      }>();
    if (error) return later("subscriber lookup failed");
    if (!sub || sub.email.toLowerCase() !== row.to_email.toLowerCase()) return suppress("suppressed: subscriber no longer exists");
    if (sub.status === "unsubscribed" || sub.unsubscribed_at) return suppress("suppressed: subscriber opted out");

    if (row.kind === "announcement") {
      return sub.status === "confirmed" ? { send: true, row } : suppress("suppressed: subscriber is not confirmed");
    }

    // newsletter_confirm
    if (sub.status !== "pending") return suppress("suppressed: subscriber is no longer pending");
    const secret = opts.secret === undefined ? getUnsubscribeSecret() : opts.secret;
    const siteUrl = opts.siteUrl === undefined ? getSiteUrl() : opts.siteUrl;
    if (!secret || !siteUrl) return later("newsletter delivery is not configured");

    const nonces = [...row.text_body.matchAll(CONFIRM_LINK_RE)].map((m) => m[1]);
    if (nonces.length === 0 || new Set(nonces).size !== 1) return suppress("suppressed: confirmation message has no link marker");
    const token = deriveConfirmToken(sub.id, nonces[0], secret);
    if (!sub.confirm_token_hash || hashToken(token) !== sub.confirm_token_hash) return suppress("suppressed: confirmation link was superseded");
    const now = (opts.now ?? (() => new Date()))();
    if (sub.confirm_token_expires_at && new Date(sub.confirm_token_expires_at) <= now) return suppress("suppressed: confirmation link expired");

    const url = `${siteUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;
    const fill = (body: string) => body.replace(CONFIRM_LINK_RE, () => url);
    // HTML-escape-safe: the URL only contains URL-safe base64 and a fixed path.
    return { send: true, row: { ...row, text_body: fill(row.text_body), html_body: row.html_body ? fill(row.html_body) : row.html_body } };
  };
}
