import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => h.db,
  isServiceClientConfigured: () => true,
}));

import { enqueueDueAnnouncementNotifications } from "./notify";

const NOW = new Date("2026-10-11T12:00:00Z");
const ann = (over: Record<string, unknown> = {}) => ({
  id: "A1", slug: "new-moot", title: "Moot registration open", body: "Details", status: "published",
  notify_subscribers: true, notified_at: null, publish_at: null, expires_at: null, ...over,
});
const sub = (id: string, over: Record<string, unknown> = {}) => ({ id, email: `${id}@example.com`, status: "confirmed", unsubscribed_at: null, ...over });

let db: FakeDb;
const outbox = () => db.tables.email_outbox;
function seed(announcements: unknown[], subscribers: unknown[]) {
  db = createFakeDb({ announcements: announcements as never[], newsletter_subscribers: subscribers as never[], email_outbox: [] });
  h.db = db;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yas.test");
  vi.stubEnv("NEWSLETTER_TOKEN_SECRET", "x".repeat(40));
});

describe("announcement notifications", () => {
  it("emails only confirmed, not-unsubscribed subscribers", async () => {
    seed([ann()], [
      sub("S1"),
      sub("S2"),
      sub("S3", { status: "pending" }),
      sub("S4", { status: "unsubscribed", unsubscribed_at: "2026-01-01T00:00:00Z" }),
      sub("S5", { unsubscribed_at: "2026-01-01T00:00:00Z" }), // inconsistent row: still excluded
    ]);
    const r = await enqueueDueAnnouncementNotifications(NOW);
    expect(r.queued).toBe(2);
    expect(outbox().map((o) => o.to_email).sort()).toEqual(["S1@example.com", "S2@example.com"]);
    expect(db.tables.announcements[0].notified_at).toBe(NOW.toISOString());
  });

  it("every email carries a signed unsubscribe link and a one-click List-Unsubscribe header", async () => {
    seed([ann()], [sub("S1")]);
    await enqueueDueAnnouncementNotifications(NOW);
    const mail = outbox()[0];
    expect(mail.text_body).toMatch(/https:\/\/yas\.test\/newsletter\/unsubscribe\?s=S1&t=/);
    const headers = mail.headers as Record<string, string>;
    expect(headers["List-Unsubscribe"]).toContain("/api/newsletter/unsubscribe?s=S1&t=");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("repeated processing never emails anyone twice", async () => {
    seed([ann()], [sub("S1"), sub("S2")]);
    await enqueueDueAnnouncementNotifications(NOW);
    await enqueueDueAnnouncementNotifications(NOW);
    expect(outbox()).toHaveLength(2);
  });

  it("recovers from a crash after queuing but before notified_at was set, without duplicates", async () => {
    seed([ann()], [sub("S1"), sub("S2")]);
    await enqueueDueAnnouncementNotifications(NOW);
    db.tables.announcements[0].notified_at = null; // simulate the lost update
    const again = await enqueueDueAnnouncementNotifications(NOW);
    expect(again.duplicates).toBe(2);
    expect(again.queued).toBe(0);
    expect(outbox()).toHaveLength(2);
    expect(db.tables.announcements[0].notified_at).toBe(NOW.toISOString());
  });

  it("does nothing unless an admin explicitly opted in", async () => {
    seed([ann({ notify_subscribers: false })], [sub("S1")]);
    expect((await enqueueDueAnnouncementNotifications(NOW)).queued).toBe(0);
    expect(outbox()).toHaveLength(0);
  });

  it.each([
    ["draft", { status: "draft" }],
    ["scheduled for the future", { publish_at: "2026-12-01T00:00:00Z" }],
    ["expired", { expires_at: "2026-10-01T00:00:00Z" }],
  ])("does not email a %s announcement", async (_label, over) => {
    seed([ann(over)], [sub("S1")]);
    await enqueueDueAnnouncementNotifications(NOW);
    expect(outbox()).toHaveLength(0);
    expect(db.tables.announcements[0].notified_at).toBeNull();
  });

  it("a scheduled announcement is emailed once it goes live", async () => {
    seed([ann({ publish_at: "2026-10-20T00:00:00Z" })], [sub("S1")]);
    await enqueueDueAnnouncementNotifications(NOW);
    expect(outbox()).toHaveLength(0);
    await enqueueDueAnnouncementNotifications(new Date("2026-10-21T00:00:00Z"));
    expect(outbox()).toHaveLength(1);
  });

  it("a queueing failure leaves the announcement un-notified (retryable) rather than marking it sent", async () => {
    seed([ann()], [sub("S1")]);
    db.failNext("email_outbox", "upsert", { message: "outbox down" });
    await enqueueDueAnnouncementNotifications(NOW);
    expect(db.tables.announcements[0].notified_at).toBeNull();
    await enqueueDueAnnouncementNotifications(NOW);
    expect(outbox()).toHaveLength(1);
  });

  it("is skipped (with a reason) when unsubscribe links cannot be signed", async () => {
    vi.stubEnv("NEWSLETTER_TOKEN_SECRET", "");
    seed([ann()], [sub("S1")]);
    const r = await enqueueDueAnnouncementNotifications(NOW);
    expect(r.skipped).toMatch(/NEWSLETTER_TOKEN_SECRET/);
    expect(outbox()).toHaveLength(0);
  });
});
