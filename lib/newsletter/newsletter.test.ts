import { describe, expect, it } from "vitest";
import { decideSubscribe, evaluateConfirmation, isEligibleForAnnouncements, RESEND_COOLDOWN_MS } from "./state";
import { generateConfirmToken, getUnsubscribeSecret, hashToken, signUnsubscribe, verifyUnsubscribe } from "./tokens";

const now = new Date("2026-10-11T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("subscribe decisions", () => {
  it("new address → create", () => expect(decideSubscribe(null, now)).toEqual({ type: "create" }));
  it("already confirmed → nothing is sent", () =>
    expect(decideSubscribe({ status: "confirmed", unsubscribed_at: null, confirmation_sent_at: null }, now)).toEqual({ type: "already_confirmed" }));
  it("pending inside the cooldown → no second email", () =>
    expect(decideSubscribe({ status: "pending", unsubscribed_at: null, confirmation_sent_at: ago(60_000) }, now)).toEqual({ type: "cooldown" }));
  it("pending after the cooldown → a fresh confirmation", () =>
    expect(decideSubscribe({ status: "pending", unsubscribed_at: null, confirmation_sent_at: ago(RESEND_COOLDOWN_MS + 1) }, now)).toMatchObject({ type: "send_confirmation" }));
  it("unsubscribed → needs a NEW confirmation; old consent is not reused", () =>
    expect(decideSubscribe({ status: "unsubscribed", unsubscribed_at: ago(1000), confirmation_sent_at: null }, now)).toEqual({ type: "send_confirmation", reason: "resubscribe" }));
});

describe("confirmation", () => {
  const future = new Date(now.getTime() + 3600_000).toISOString();
  it("valid, unexpired pending token confirms", () => expect(evaluateConfirmation({ status: "pending", confirm_token_expires_at: future }, now)).toBe("confirmed"));
  it("expired token is rejected", () => expect(evaluateConfirmation({ status: "pending", confirm_token_expires_at: ago(1) }, now)).toBe("expired"));
  it("unknown or already-confirmed (used) token is invalid", () => {
    expect(evaluateConfirmation(null, now)).toBe("invalid");
    expect(evaluateConfirmation({ status: "confirmed", confirm_token_expires_at: future }, now)).toBe("invalid");
  });
});

describe("eligibility for announcement email", () => {
  it("only confirmed and not unsubscribed", () => {
    expect(isEligibleForAnnouncements({ status: "confirmed", unsubscribed_at: null })).toBe(true);
    expect(isEligibleForAnnouncements({ status: "pending", unsubscribed_at: null })).toBe(false);
    expect(isEligibleForAnnouncements({ status: "unsubscribed", unsubscribed_at: ago(5) })).toBe(false);
    expect(isEligibleForAnnouncements({ status: "confirmed", unsubscribed_at: ago(5) })).toBe(false);
  });
});

describe("tokens", () => {
  it("confirm tokens are random and only their hash is comparable", () => {
    const a = generateConfirmToken(), b = generateConfirmToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toContain(a);
  });
  it("unsubscribe signatures verify, and fail when tampered, for another id, or with another secret", () => {
    const secret = "s".repeat(40);
    const sig = signUnsubscribe("id-1", secret);
    expect(verifyUnsubscribe("id-1", sig, secret)).toBe(true);
    expect(verifyUnsubscribe("id-2", sig, secret)).toBe(false);
    expect(verifyUnsubscribe("id-1", sig.slice(0, -2) + "xx", secret)).toBe(false);
    expect(verifyUnsubscribe("id-1", sig, "t".repeat(40))).toBe(false);
    expect(verifyUnsubscribe("id-1", "", secret)).toBe(false);
  });
  it("a missing or short secret disables unsubscribe signing rather than using a weak one", () => {
    expect(getUnsubscribeSecret({} as NodeJS.ProcessEnv)).toBeNull();
    expect(getUnsubscribeSecret({ NEWSLETTER_TOKEN_SECRET: "short" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
