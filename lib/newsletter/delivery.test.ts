import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";
import { processOutboxBatch, type OutboxRow, type OutboxStore } from "@/lib/email/outbox";
import { createNewsletterDeliveryGuard } from "./delivery";
import { deriveConfirmToken, hashToken } from "./tokens";

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => h.db, isServiceClientConfigured: () => true }));

import { confirmSubscription, subscribeToNewsletter, unsubscribeSubscriber } from "./service";

const SECRET = "d".repeat(40);
const SITE = "https://yas.test";
let db: FakeDb;
const guard = (o: { secret?: string | null; siteUrl?: string | null; now?: Date } = {}) =>
  createNewsletterDeliveryGuard(db as never, { siteUrl: SITE, secret: SECRET, ...o, now: o.now ? () => o.now! : undefined });

const NONCE = "n".repeat(22);
const confirmRow = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  id: "o1", kind: "newsletter_confirm", dedupe_key: "nl-confirm:s1:abcd", to_email: "a@x.test", reply_to: null,
  subject: "Confirm", text_body: `Please confirm:\n\nyas-confirm-link:${NONCE}\n`, html_body: `<a href="yas-confirm-link:${NONCE}">Confirm</a>`,
  headers: {}, attempts: 1, ...over,
});
const announceRow = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  id: "o2", kind: "announcement", dedupe_key: "announcement:a9:s1", to_email: "a@x.test", reply_to: null,
  subject: "News", text_body: "Body https://yas.test/newsletter/unsubscribe?s=s1&t=sig", html_body: null, headers: {}, attempts: 1, ...over,
});
const pendingSub = (over: Record<string, unknown> = {}) => ({
  id: "s1", email: "a@x.test", status: "pending", unsubscribed_at: null,
  confirm_token_hash: hashToken(deriveConfirmToken("s1", NONCE, SECRET)),
  confirm_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(), ...over,
});

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  vi.stubEnv("NEWSLETTER_TOKEN_SECRET", SECRET);
  db = createFakeDb({ newsletter_subscribers: [], email_outbox: [] });
  h.db = db;
});

describe("delivery guard: confirmation mail", () => {
  it("builds the real link only at delivery and sends it", async () => {
    db.tables.newsletter_subscribers.push(pendingSub());
    const d = await guard()(confirmRow());
    expect(d.send).toBe(true);
    const token = deriveConfirmToken("s1", NONCE, SECRET);
    if (d.send) {
      expect(d.row.text_body).toContain(`${SITE}/newsletter/confirm?token=${encodeURIComponent(token)}`);
      expect(d.row.html_body).toContain(encodeURIComponent(token));
      expect(d.row.text_body).not.toContain("yas-confirm-link");
    }
  });

  it("an opt-out AFTER queueing is honoured: nothing is sent", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ status: "unsubscribed", unsubscribed_at: "2026-10-01T00:00:00Z" }));
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/opted out/) });
  });

  it("a superseded link (a newer one was issued) is suppressed", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ confirm_token_hash: hashToken("some-newer-token") }));
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/superseded/) });
  });

  it("an expired link is suppressed", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ confirm_token_expires_at: "2020-01-01T00:00:00Z" }));
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/expired/) });
  });

  it("an already-confirmed or deleted subscriber gets no confirmation email", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ status: "confirmed" }));
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false });
    db.tables.newsletter_subscribers.length = 0;
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/no longer exists/) });
  });

  it("a wrong recipient address for that subscriber is suppressed", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ email: "someone-else@x.test" }));
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: false });
  });

  it("temporary problems are retried, never sent and never marked dead: missing secret/site, lookup failure", async () => {
    db.tables.newsletter_subscribers.push(pendingSub());
    expect(await guard({ secret: null })(confirmRow())).toMatchObject({ send: false, retry: true });
    expect(await guard({ siteUrl: null })(confirmRow())).toMatchObject({ send: false, retry: true });
    db.failNext("newsletter_subscribers", "select", { message: "boom" });
    expect(await guard()(confirmRow())).toMatchObject({ send: false, retry: true });
  });

  it("a message without the link marker is never sent", async () => {
    db.tables.newsletter_subscribers.push(pendingSub());
    expect(await guard()(confirmRow({ text_body: "no link here" }))).toMatchObject({ send: false, retry: false });
  });
});

describe("delivery guard: announcements and other mail", () => {
  it("sends only to a still-confirmed subscriber; an opt-out after queueing blocks it", async () => {
    db.tables.newsletter_subscribers.push(pendingSub({ status: "confirmed" }));
    expect((await guard()(announceRow())).send).toBe(true);
    db.tables.newsletter_subscribers[0].status = "unsubscribed";
    db.tables.newsletter_subscribers[0].unsubscribed_at = "2026-10-02T00:00:00Z";
    expect(await guard()(announceRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/opted out/) });
  });

  it("a pending (never confirmed) subscriber never receives announcements", async () => {
    db.tables.newsletter_subscribers.push(pendingSub());
    expect(await guard()(announceRow())).toMatchObject({ send: false, retry: false, reason: expect.stringMatching(/not confirmed/) });
  });

  it("contact mail is not newsletter mail and passes through untouched", async () => {
    const row = { ...announceRow(), kind: "contact" as const, dedupe_key: "contact:1" };
    expect(await guard()(row)).toEqual({ send: true, row });
  });
});

// ---- worker integration: real outbox rows, in-memory store, mocked provider (nothing is ever sent) ----
function memoryStore(): { store: OutboxStore; rows: () => Record<string, unknown>[] } {
  return {
    rows: () => db.tables.email_outbox,
    store: {
      async claimDue(limit) {
        // The fake database applies no column defaults, so a row with no status is the real default, "pending".
        const due = db.tables.email_outbox.filter((r) => !r.status || r.status === "pending" || r.status === "failed").slice(0, limit);
        for (const r of due) { r.status = "sending"; r.attempts = ((r.attempts as number) ?? 0) + 1; }
        return due.map((r) => ({ ...r })) as unknown as OutboxRow[];
      },
      async markSent(id) { Object.assign(db.tables.email_outbox.find((r) => r.id === id)!, { status: "sent" }); },
      async markFailed(id, u) { Object.assign(db.tables.email_outbox.find((r) => r.id === id)!, { status: u.status, last_error: u.error }); },
    },
  };
}

describe("end to end through the worker (mock provider, no real email)", () => {
  it("subscribe -> persistent row has no link -> worker delivers a link that confirms the subscriber", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    const { store, rows } = memoryStore();
    const send = vi.fn().mockResolvedValue({ ok: true, id: "prov-1" });
    const r = await processOutboxBatch({ store, send, prepare: createNewsletterDeliveryGuard(db as never) });
    expect(r).toMatchObject({ claimed: 1, sent: 1, suppressed: 0 });
    const sent = send.mock.calls[0][0];
    const token = decodeURIComponent(/token=([^\s&]+)/.exec(sent.text)![1]);
    expect(rows()[0].status).toBe("sent");
    expect(JSON.stringify(rows()[0])).not.toContain(token);
    expect(await confirmSubscription(token)).toBe("confirmed");
    expect(db.tables.newsletter_subscribers[0]).toMatchObject({ status: "confirmed", confirm_token_hash: null });
  });

  it("subscribe, then unsubscribe before delivery -> the provider is never called and the row is dead/suppressed", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    const id = db.tables.newsletter_subscribers[0].id as string;
    await unsubscribeSubscriber(id);
    const { store, rows } = memoryStore();
    const send = vi.fn();
    const r = await processOutboxBatch({ store, send, prepare: createNewsletterDeliveryGuard(db as never) });
    expect(send).not.toHaveBeenCalled();
    expect(r).toMatchObject({ claimed: 1, sent: 0, dead: 1, suppressed: 1 });
    expect(rows()[0]).toMatchObject({ status: "dead", last_error: expect.stringMatching(/opted out/) });
  });

  it("a failed delivery is retried and the SAME link works on the retry (deterministic token)", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    const { store, rows } = memoryStore();
    const send = vi.fn().mockResolvedValueOnce({ ok: false, retryable: true, error: "provider timeout" }).mockResolvedValueOnce({ ok: true, id: "p" });
    const guardFn = createNewsletterDeliveryGuard(db as never);
    expect(await processOutboxBatch({ store, send, prepare: guardFn })).toMatchObject({ retrying: 1, sent: 0 });
    expect(rows()[0].status).toBe("failed");
    expect(await processOutboxBatch({ store, send, prepare: guardFn })).toMatchObject({ sent: 1 });
    const link = (i: number) => /token=([^\s&]+)/.exec(send.mock.calls[i][0].text)![1];
    expect(link(1)).toBe(link(0));
    expect(rows()).toHaveLength(1); // never a second row, so never a second email
  });

  it("a temporary guard problem retries without sending", async () => {
    await subscribeToNewsletter("a@example.com", "x");
    const { store, rows } = memoryStore();
    const send = vi.fn();
    const r = await processOutboxBatch({ store, send, prepare: createNewsletterDeliveryGuard(db as never, { siteUrl: null }) });
    expect(send).not.toHaveBeenCalled();
    expect(r).toMatchObject({ retrying: 1, dead: 0, suppressed: 0 });
    expect(rows()[0].status).toBe("failed");
  });
});
