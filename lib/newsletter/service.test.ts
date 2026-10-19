import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";
import { hashToken } from "./tokens";
import { createNewsletterDeliveryGuard } from "./delivery";

const h = vi.hoisted(() => ({ db: null as unknown, configured: true }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => h.db,
  isServiceClientConfigured: () => h.configured,
}));

import { confirmSubscription, getConsentSummary, requestLegacyReconsent, subscribeToNewsletter, unsubscribeSubscriber } from "./service";

let db: FakeDb;
const outbox = () => db.tables.email_outbox;
const subs = () => db.tables.newsletter_subscribers;
const SECRET = "t".repeat(40);
// The queued row holds only a nonce; the real link exists only after the delivery guard builds it.
const deliver = async (row: unknown) => {
  const d = await createNewsletterDeliveryGuard(db as never, { siteUrl: "https://yas.test", secret: SECRET })(row as never);
  if (!d.send) throw new Error(d.reason);
  return d.row;
};
const tokenFrom = async (row: unknown) => decodeURIComponent(/token=([^\s&]+)/.exec((await deliver(row)).text_body)![1]);

beforeEach(() => {
  h.configured = true;
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yas.test");
  vi.stubEnv("NEWSLETTER_TOKEN_SECRET", SECRET);
  db = createFakeDb({ newsletter_subscribers: [], email_outbox: [] });
  h.db = db;
});

describe("subscribeToNewsletter (double opt-in)", () => {
  it("creates a PENDING subscriber — never confirmed — and queues exactly one confirmation email", async () => {
    expect(await subscribeToNewsletter("  Alice@Example.COM ", "homepage_footer")).toEqual({ ok: true });
    expect(subs()).toHaveLength(1);
    expect(subs()[0]).toMatchObject({ email: "alice@example.com", status: "pending", confirmed_at: null });
    expect(outbox()).toHaveLength(1);
    expect(outbox()[0]).toMatchObject({ kind: "newsletter_confirm", to_email: "alice@example.com" });
  });

  it("stores only a hash of the token, and NO usable link anywhere in the persistent outbox", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    const token = await tokenFrom(outbox()[0]);
    expect(subs()[0].confirm_token_hash).toBe(hashToken(token));
    expect(JSON.stringify(subs()[0])).not.toContain(token);
    // Persistent record: marker + nonce only. No token, no /newsletter/confirm URL, in text, html or headers.
    const stored = JSON.stringify(outbox()[0]);
    expect(stored).not.toContain(token);
    expect(stored).not.toMatch(/newsletter\/confirm|token=/);
    expect(outbox()[0].text_body).toContain("yas-confirm-link:");
    // The delivered message does carry the working link.
    expect((await deliver(outbox()[0])).text_body).toContain(`https://yas.test/newsletter/confirm?token=${encodeURIComponent(token)}`);
    expect(subs()[0].confirm_token_expires_at).toBeTruthy();
  });

  it("repeating the signup (double-click, retry) does not send a second email inside the cooldown", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    await subscribeToNewsletter("A@example.com", "x");
    expect(subs()).toHaveLength(1);
    expect(outbox()).toHaveLength(1);
  });

  it("an already-confirmed address gets no email and stays confirmed", async () => {
    subs().push({ id: "s1", email: "a@example.com", status: "confirmed", unsubscribed_at: null, confirmation_sent_at: null });
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: true });
    expect(outbox()).toHaveLength(0);
    expect(subs()[0].status).toBe("confirmed");
  });

  it("a previously unsubscribed address must re-confirm; it is not silently re-activated", async () => {
    subs().push({ id: "s1", email: "a@example.com", status: "unsubscribed", unsubscribed_at: "2026-01-01T00:00:00Z", confirmation_sent_at: null });
    await subscribeToNewsletter("a@example.com", "x");
    expect(subs()[0]).toMatchObject({ status: "pending", unsubscribed_at: null, confirmed_at: null });
    expect(outbox()).toHaveLength(1);
  });

  it("does not claim success when the confirmation cannot be queued", async () => {
    db.failNext("email_outbox", "upsert", { message: "outbox down" });
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: false, reason: "failed" });
  });

  it("is unavailable (not fake-successful) when the site URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: false, reason: "not_configured" });
    expect(subs()).toHaveLength(0);
  });
});

describe("confirmSubscription", () => {
  async function pendingToken() {
    await subscribeToNewsletter("a@example.com", "x");
    return tokenFrom(outbox()[0]);
  }

  it("confirms a valid token and clears it", async () => {
    const token = await pendingToken();
    expect(await confirmSubscription(token)).toBe("confirmed");
    expect(subs()[0]).toMatchObject({ status: "confirmed", confirm_token_hash: null, confirm_token_expires_at: null });
    expect(subs()[0].confirmed_at).toBeTruthy();
  });

  it("is single-use: a second attempt with the same token fails", async () => {
    const token = await pendingToken();
    await confirmSubscription(token);
    expect(await confirmSubscription(token)).toBe("invalid");
  });

  it("rejects an expired token and leaves the subscriber unconfirmed", async () => {
    const token = await pendingToken();
    subs()[0].confirm_token_expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await confirmSubscription(token)).toBe("expired");
    expect(subs()[0].status).toBe("pending");
  });

  it("rejects unknown, empty and oversized tokens", async () => {
    await pendingToken();
    expect(await confirmSubscription("not-a-real-token")).toBe("invalid");
    expect(await confirmSubscription("")).toBe("invalid");
    expect(await confirmSubscription("x".repeat(500))).toBe("invalid");
    expect(subs()[0].status).toBe("pending");
  });

  it("confirming one subscriber does not affect another", async () => {
    const t1 = await pendingToken();
    await subscribeToNewsletter("b@example.com", "x");
    await confirmSubscription(t1);
    expect(subs().find((s) => s.email === "b@example.com")?.status).toBe("pending");
  });
});

describe("unsubscribeSubscriber", () => {
  it("records the opt-out (does not delete) and is idempotent", async () => {
    subs().push({ id: "s1", email: "a@example.com", status: "confirmed", unsubscribed_at: null });
    expect(await unsubscribeSubscriber("s1")).toBe(true);
    expect(await unsubscribeSubscriber("s1")).toBe(true);
    expect(subs()).toHaveLength(1);
    expect(subs()[0]).toMatchObject({ status: "unsubscribed" });
    expect(subs()[0].unsubscribed_at).toBeTruthy();
  });
});

describe("hourly confirmation-email budget (holds across serverless instances)", () => {
  it("refuses new confirmation emails once the database shows the ceiling reached, and stores nothing", async () => {
    const recent = new Date().toISOString();
    for (let i = 0; i < 100; i++) outbox().push({ id: `o${i}`, kind: "newsletter_confirm", dedupe_key: `k${i}`, created_at: recent });
    expect(await subscribeToNewsletter("late@example.com", "x")).toEqual({ ok: false, reason: "busy" });
    expect(subs()).toHaveLength(0);
  });
  it("old rows outside the window do not count", async () => {
    const old = new Date(Date.now() - 2 * 3_600_000).toISOString();
    for (let i = 0; i < 100; i++) outbox().push({ id: `o${i}`, kind: "newsletter_confirm", dedupe_key: `k${i}`, created_at: old });
    expect(await subscribeToNewsletter("ok@example.com", "x")).toEqual({ ok: true });
  });
});

describe("legacy re-consent (operator-triggered, never automatic)", () => {
  const legacy = (email: string, over: Record<string, unknown> = {}) => ({ id: `id-${email}`, email, status: "pending", confirmation_sent_at: null, unsubscribed_at: null, subscribed_at: "2025-01-01T00:00:00Z", ...over });

  it("a dry run only counts: nothing is queued, nobody is changed", async () => {
    subs().push(legacy("a@x.test"), legacy("b@x.test"));
    const r = await requestLegacyReconsent({ execute: false });
    expect(r).toEqual({ eligible: 2, queued: 0, skipped: 0, failed: 0, stoppedBy: "none" });
    expect(outbox()).toHaveLength(0);
    expect(subs().every((s) => s.confirm_token_hash === undefined)).toBe(true);
  });

  it("targets only legacy pending subscribers: never confirmed, unsubscribed, or already-asked addresses", async () => {
    subs().push(
      legacy("legacy@x.test"),
      legacy("confirmed@x.test", { status: "confirmed" }),
      legacy("gone@x.test", { status: "unsubscribed", unsubscribed_at: "2026-01-01T00:00:00Z" }),
      legacy("asked@x.test", { confirmation_sent_at: "2026-10-01T00:00:00Z" })
    );
    const r = await requestLegacyReconsent({ execute: true });
    expect(r.queued).toBe(1);
    expect(outbox().map((o) => o.to_email)).toEqual(["legacy@x.test"]);
  });

  it("sends the standard confirmation email only, and confirms nobody", async () => {
    subs().push(legacy("legacy@x.test"));
    await requestLegacyReconsent({ execute: true });
    expect(outbox()[0].kind).toBe("newsletter_confirm");
    expect(subs()[0].status).toBe("pending");
    expect(subs()[0].confirmed_at ?? null).toBeNull();
  });

  it("re-running does not email the same person again", async () => {
    subs().push(legacy("legacy@x.test"));
    await requestLegacyReconsent({ execute: true });
    const again = await requestLegacyReconsent({ execute: true });
    expect(again.queued).toBe(0);
    expect(outbox()).toHaveLength(1);
  });

  it("is bounded per call and by the hourly budget", async () => {
    for (let i = 0; i < 5; i++) subs().push(legacy(`u${i}@x.test`));
    expect((await requestLegacyReconsent({ execute: true, limit: 2 })).queued).toBe(2);
    const recent = new Date().toISOString();
    for (let i = 0; i < 100; i++) outbox().push({ id: `b${i}`, kind: "newsletter_confirm", dedupe_key: `bk${i}`, created_at: recent });
    const blocked = await requestLegacyReconsent({ execute: true, limit: 2 });
    expect(blocked).toMatchObject({ queued: 0, stoppedBy: "budget" });
  });

  it("an opt-out that lands after the preview is never cleared or emailed (claim is conditional)", async () => {
    subs().push(legacy("a@x.test"), legacy("b@x.test"), legacy("c@x.test"));
    // Simulate B unsubscribing after the batch was selected but before it is reached.
    const orig = db.from.bind(db);
    let fired = false;
    db.from = (t: string) => {
      if (t === "email_outbox" && !fired) { fired = true; Object.assign(subs()[1], { status: "unsubscribed", unsubscribed_at: "2026-10-10T00:00:00Z" }); }
      return orig(t);
    };
    const r = await requestLegacyReconsent({ execute: true });
    expect(r).toMatchObject({ queued: 2, skipped: 1, failed: 0 });
    expect(outbox().map((o) => o.to_email).sort()).toEqual(["a@x.test", "c@x.test"]);
    expect(subs()[1]).toMatchObject({ status: "unsubscribed", unsubscribed_at: "2026-10-10T00:00:00Z" });
    expect(subs()[1].confirm_token_hash ?? null).toBeNull();
  });

  it("two overlapping runs cannot email anyone twice (atomic claim)", async () => {
    for (let i = 0; i < 4; i++) subs().push(legacy(`u${i}@x.test`));
    const [one, two] = await Promise.all([requestLegacyReconsent({ execute: true }), requestLegacyReconsent({ execute: true })]);
    expect(one.queued + two.queued).toBe(4);
    expect(one.skipped + two.skipped).toBe(4);
    expect(outbox()).toHaveLength(4);
    expect(new Set(outbox().map((o) => o.to_email)).size).toBe(4);
  });

  it("a queue failure releases the claim, stops the batch, and a retry sends exactly one email each", async () => {
    for (const n of ["a", "b", "c"]) subs().push(legacy(`${n}@x.test`));
    expect(await requestLegacyReconsent({ execute: true, limit: 1 })).toMatchObject({ queued: 1, failed: 0 });
    db.failNext("email_outbox", "upsert", { message: "provider said: secret-detail-123" });
    const broken = await requestLegacyReconsent({ execute: true, limit: 2 });
    expect(broken).toMatchObject({ queued: 0, failed: 1, stoppedBy: "error" });
    // B's claim was released: still pending, never marked as asked, holds no token. C was not touched.
    expect(subs()[1].confirmation_sent_at ?? null).toBeNull();
    expect(subs()[1].confirm_token_hash ?? null).toBeNull();
    expect(subs()[2].confirmation_sent_at ?? null).toBeNull();
    expect(outbox()).toHaveLength(1);
    // The failure detail is never part of the returned result.
    expect(JSON.stringify(broken)).not.toContain("secret-detail-123");
    const retry = await requestLegacyReconsent({ execute: true });
    expect(retry).toMatchObject({ queued: 2, failed: 0 });
    expect(outbox().map((o) => o.to_email).sort()).toEqual(["a@x.test", "b@x.test", "c@x.test"]);
  });

  it("preserves every record, confirms nobody, and returns counts only (no tokens)", async () => {
    for (const n of ["a", "b", "c"]) subs().push(legacy(`${n}@x.test`));
    subs().push(legacy("gone@x.test", { status: "unsubscribed", unsubscribed_at: "2026-01-01T00:00:00Z" }));
    const before = subs().map((s) => s.email).sort();
    const r = await requestLegacyReconsent({ execute: true });
    expect(subs().map((s) => s.email).sort()).toEqual(before);
    expect(subs().filter((s) => s.status === "confirmed")).toHaveLength(0);
    expect(subs().find((s) => s.email === "gone@x.test")).toMatchObject({ status: "unsubscribed" });
    expect(Object.keys(r).sort()).toEqual(["eligible", "failed", "queued", "skipped", "stoppedBy"]);
    // Only the hash is stored; the raw token exists only inside the queued email text.
    for (const row of subs().filter((s) => s.confirm_token_hash)) {
      const mail = outbox().find((o) => o.to_email === row.email)!;
      expect(row.confirm_token_hash).toBe(hashToken(await tokenFrom(mail)));
    }
  });

  it("reports not_configured (and touches nothing) when the server is not set up", async () => {
    subs().push(legacy("a@x.test"));
    h.configured = false;
    expect(await requestLegacyReconsent({ execute: true })).toMatchObject({ queued: 0, stoppedBy: "not_configured" });
    expect(outbox()).toHaveLength(0);
  });

  it("summarises consent states", async () => {
    subs().push(legacy("l@x.test"), legacy("c@x.test", { status: "confirmed" }), legacy("u@x.test", { status: "unsubscribed", unsubscribed_at: "2026-01-01T00:00:00Z" }), legacy("p@x.test", { confirmation_sent_at: "2026-10-01T00:00:00Z" }));
    expect(await getConsentSummary()).toEqual({ confirmed: 1, legacyUnconfirmed: 1, pendingAwaitingConfirmation: 1, unsubscribed: 1 });
  });
});

describe("when sign-up is unavailable the OPERATOR is told why (names only, never values)", () => {
  it("a missing service-role key is named in the server log; the visitor path still reports not_configured", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    h.configured = false;
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: false, reason: "not_configured" });
    const line = log.mock.calls.flat().join(" ");
    expect(line).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(line).not.toContain("real.supabase.co");
    log.mockRestore();
  });

  it("a missing or placeholder site URL is named too", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://your-domain.com");
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: false, reason: "not_configured" });
    expect(log.mock.calls.flat().join(" ")).toContain("NEXT_PUBLIC_SITE_URL");
    log.mockRestore();
  });

  it("an unreadable email_outbox (migration 007 not applied) is a FAILURE, not a misleading 'busy'", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    db.failNext("email_outbox", "select", { message: 'relation "email_outbox" does not exist' });
    expect(await subscribeToNewsletter("a@example.com", "x")).toEqual({ ok: false, reason: "failed" });
    expect(subs()).toHaveLength(0);
    log.mockRestore();
  });
});
