import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";
import { isEligibleForAnnouncements } from "@/lib/newsletter/state";

const h = vi.hoisted(() => ({ client: null as unknown, require: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.client }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: h.require }));

import { resubscribeSubscriberAction, unsubscribeSubscriberAction } from "./newsletter";

let db: FakeDb;
const row = () => db.tables.newsletter_subscribers[0] as { status: "pending" | "confirmed" | "unsubscribed"; unsubscribed_at: string | null; confirmed_at: string | null };

beforeEach(() => {
  h.require.mockReset().mockResolvedValue(undefined);
  db = createFakeDb({ newsletter_subscribers: [{ id: "s1", email: "a@x.test", status: "confirmed", confirmed_at: "2026-01-01T00:00:00Z", unsubscribed_at: null, confirm_token_hash: "hash" }] });
  h.client = { from: (t: string) => db.from(t) };
});

describe("admin newsletter actions keep status authoritative (no consent forged by an admin)", () => {
  it("unsubscribing sets BOTH status and unsubscribed_at, so the markers can never disagree", async () => {
    await unsubscribeSubscriberAction("s1");
    expect(row().status).toBe("unsubscribed");
    expect(row().unsubscribed_at).toBeTruthy();
    expect(isEligibleForAnnouncements(row())).toBe(false);
  });

  it("'re-subscribing' returns the person to PENDING — never confirmed, never eligible for email", async () => {
    await unsubscribeSubscriberAction("s1");
    await resubscribeSubscriberAction("s1");
    expect(row()).toMatchObject({ status: "pending", unsubscribed_at: null, confirmed_at: null });
    expect(isEligibleForAnnouncements(row())).toBe(false);
  });

  it("both actions require an administrator before touching the database", async () => {
    h.require.mockRejectedValue(new Error("forbidden"));
    await expect(unsubscribeSubscriberAction("s1")).rejects.toThrow("forbidden");
    await expect(resubscribeSubscriberAction("s1")).rejects.toThrow("forbidden");
    expect(db.calls).toHaveLength(0);
    expect(row().status).toBe("confirmed");
  });
});
