/**
 * Provider-independent email sending. Contact, newsletter and announcement
 * workflows all go through `EmailSender`; none of them know which provider
 * is behind it. Only Resend is implemented (plain `fetch`, no new package).
 *
 * Env (names only — values live in .env.local / the host's secret store):
 *   EMAIL_PROVIDER   "resend" (default)
 *   RESEND_API_KEY   provider credential — server-side only
 *   EMAIL_FROM       e.g. "Young Arbitrators Society <noreply@your-domain>"
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Stable per logical email so a provider-side retry cannot double-send. */
  idempotencyKey: string;
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; retryable: boolean; error: string };

export type EmailSender = (message: EmailMessage) => Promise<SendResult>;

const CRLF = /[\r\n\u0085\u2028\u2029]/;

/** Reject any value that could smuggle an extra header line. */
export function hasHeaderInjection(value: string): boolean {
  return CRLF.test(value);
}

export function isEmailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const provider = (env.EMAIL_PROVIDER ?? "resend").toLowerCase();
  return provider === "resend" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/** A hung provider must not hang a request or the cron run. */
export const PROVIDER_TIMEOUT_MS = 10_000;

export function createResendSender(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = PROVIDER_TIMEOUT_MS
): EmailSender {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;

  return async (message) => {
    if (!apiKey || !from) {
      return { ok: false, retryable: false, error: "Email provider is not configured." };
    }
    const unsafe = [message.to, message.subject, message.replyTo ?? "", from]
      .concat(Object.entries(message.headers ?? {}).flat())
      .some(hasHeaderInjection);
    if (unsafe) {
      return { ok: false, retryable: false, error: "Refused: header injection detected." };
    }

    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          reply_to: message.replyTo,
          headers: message.headers,
        }),
      });

      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { id?: string };
        return { ok: true, id: body.id ?? null };
      }
      // Only the status is recorded — never the request body (it may hold
      // visitor-supplied content) and never the Authorization header.
      const retryable = response.status === 429 || response.status >= 500;
      return { ok: false, retryable, error: `Provider responded with HTTP ${response.status}` };
    } catch (error) {
      // A timeout is AMBIGUOUS: the provider may have accepted the message.
      // It is retried with the same Idempotency-Key (the outbox id), so the
      // provider dedupes instead of sending twice (within its idempotency
      // window — see docs/EMAIL_OPERATIONS.md).
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return {
        ok: false,
        retryable: true,
        error: timedOut ? "Provider request timed out (delivery status unknown)" : "Network error contacting email provider",
      };
    }
  };
}

export function getEmailSender(env: NodeJS.ProcessEnv = process.env): EmailSender | null {
  return isEmailConfigured(env) ? createResendSender(env) : null;
}
