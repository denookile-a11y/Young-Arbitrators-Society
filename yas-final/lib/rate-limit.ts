/**
 * Minimal, dependency-free rate limiter for unauthenticated public Server
 * Actions and routes (contact, join, newsletter signup, search).
 *
 * HOW IT WORKS: fixed-window counter per key, held in a module-level Map.
 * A key that exceeds `max` requests within `windowMs` is refused until the
 * window rolls over.
 *
 * WHAT THIS DOES NOT DO — read before relying on it in production:
 *
 * 1. This state is IN-MEMORY, PER SERVER INSTANCE/LAMBDA. On Vercel (or any
 *    horizontally-scaled deployment), each concurrent instance has its own
 *    counter — a client hammering the endpoint can land on different
 *    instances and get a higher effective limit than configured, and a
 *    serverless function that recycles between invocations may reset the
 *    counter entirely. This is a best-effort speed bump against casual
 *    scripted abuse and accidental retry storms, NOT a hard guarantee.
 *
 * 2. For a real multi-instance guarantee, use a shared store — Vercel KV /
 *    Upstash Redis (`@upstash/ratelimit`) is the natural fit for this
 *    deployment target and was deliberately NOT added here per the
 *    directive's "avoid adding a large dependency unless necessary"
 *    instruction. Swapping the storage in `checkRateLimit` below for a
 *    Redis-backed INCR+EXPIRE is the upgrade path; the call sites in the
 *    four action files do not need to change.
 *
 * 3. The identifying key is the caller's IP, taken from standard proxy
 *    headers (`x-forwarded-for`, `x-real-ip`) since Server Actions don't
 *    get a raw socket address on Vercel. IP-based limiting is imperfect
 *    (NAT, shared IPs, spoofable headers on a misconfigured proxy) but is
 *    the only identifier available for an unauthenticated caller without
 *    adding a CAPTCHA or session-cookie requirement neither of which was
 *    requested.
 *
 * FAILURE BEHAVIOUR: when the limit is exceeded, `checkRateLimit` returns
 * `{ ok: false }` and the calling action returns its normal user-facing
 * form-error shape (never a raw 429 or stack trace) with a friendly
 * "try again shortly" message. Administrators are never subject to this —
 * these limiters are only ever called from the public (no-auth) actions,
 * never from anything behind requireAdmin/checkAdmin.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the Map doesn't grow unbounded over
// a long-lived instance's lifetime. Cheap and only runs on the (rare)
// cache-miss path below, not on every request.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitConfig {
  /** Identifies the endpoint, so "contact" and "join" don't share a bucket. */
  name: string;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = `${config.name}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    sweep(now);
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { ok: true };
  }

  if (existing.count >= config.max) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Best-effort client identifier for an unauthenticated Server Action call.
 * Server Actions don't receive a NextRequest, so this reads the standard
 * forwarded headers via next/headers. Falls back to a constant key (i.e.
 * effectively a single shared bucket) if no header is present at all,
 * which only happens in local dev without a proxy in front — never on
 * Vercel, where x-forwarded-for is always set.
 */
export async function getClientIdentifier(): Promise<string> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
