import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Random single-use confirmation token. Only its SHA-256 hash is stored. */
export function generateConfirmToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Confirmation links are NOT stored in the outbox. The queued email carries only
 * a random, non-secret nonce; the real token is derived at delivery time as
 * HMAC(secret, subscriberId + nonce). Reading the outbox table therefore never
 * yields a usable confirmation link (it would also need NEWSLETTER_TOKEN_SECRET),
 * yet the delivery worker can always rebuild exactly the token whose SHA-256 hash
 * is stored on the subscriber row.
 */
export function generateConfirmNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function deriveConfirmToken(subscriberId: string, nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(`confirm:${subscriberId}:${nonce}`).digest("base64url");
}

/** Marker written into a queued confirmation email in place of the link. */
export const CONFIRM_LINK_MARKER = "yas-confirm-link:";
export const CONFIRM_LINK_RE = /yas-confirm-link:([A-Za-z0-9_-]{16,64})/g;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Secret for unsubscribe signatures; null (feature off) if unset or too short. */
export function getUnsubscribeSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.NEWSLETTER_TOKEN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/**
 * Stateless unsubscribe token: HMAC(subscriberId). Nothing is stored, it
 * cannot be forged without the secret, and it never expires — a person must
 * always be able to opt out of an email they received months ago.
 */
export function signUnsubscribe(subscriberId: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${subscriberId}`).digest("base64url");
}

export function verifyUnsubscribe(subscriberId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signUnsubscribe(subscriberId, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
