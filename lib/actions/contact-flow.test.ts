import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";

const h = vi.hoisted(() => ({
  client: null as unknown,
  rate: { ok: true },
  enqueue: vi.fn(),
  process: vi.fn(),
  recipient: vi.fn(),
  after: vi.fn(),
  budget: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.client }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => h.rate, getClientIdentifier: async () => "ip" }));
vi.mock("@/lib/email/outbox", () => ({ enqueueEmails: h.enqueue, processOutbox: h.process }));
vi.mock("next/server", () => ({ after: h.after }));
vi.mock("@/lib/email/budget", () => ({ withinEmailBudget: h.budget }));
vi.mock("@/lib/email/recipient", () => ({ resolveContactRecipient: h.recipient }));

import { submitContactFormAction } from "./contact";

const form = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };
const valid = { name: "Wanjiru", email: "visitor@example.com", message: "Hello YAS" };

let db: FakeDb;
beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeDb({ contact_messages: [] }, {});
  h.client = { from: (t: string) => db.from(t) };
  h.rate = { ok: true };
  h.enqueue.mockResolvedValue({ ok: true, inserted: 1, duplicates: 0 });
  h.process.mockResolvedValue({ claimed: 1, sent: 1, retrying: 0, dead: 0 });
  h.recipient.mockResolvedValue("inbox@yas-ku.org");
  h.budget.mockResolvedValue(true);
});

describe("submitContactFormAction", () => {
  it("stores the message and queues ONE email to the configured recipient (never the visitor's address)", async () => {
    const r = await submitContactFormAction({}, form(valid));
    expect(r).toEqual({ success: true });
    expect(db.tables.contact_messages).toHaveLength(1);
    const [emails] = h.enqueue.mock.calls[0];
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("inbox@yas-ku.org");
    expect(emails[0].replyTo).toBe("visitor@example.com");
    expect(emails[0].dedupeKey).toBe(`contact:${db.tables.contact_messages[0].id}`);
    expect(emails[0].subject).not.toMatch(/[\r\n]/);
    // Delivery is deferred until after the response, not awaited by the visitor.
    expect(h.process).not.toHaveBeenCalled();
    expect(h.after).toHaveBeenCalledTimes(1);
    await h.after.mock.calls[0][0]();
    expect(h.process).toHaveBeenCalledTimes(1);
  });

  it("the stored record and the email share one id, so a re-delivery dedupes instead of double-sending", async () => {
    await submitContactFormAction({}, form(valid));
    const id = db.tables.contact_messages[0].id;
    expect(h.enqueue.mock.calls[0][0][0].dedupeKey).toBe(`contact:${id}`);
  });

  it("invalid input returns field errors and neither stores nor emails", async () => {
    const r = await submitContactFormAction({}, form({ ...valid, email: "bad" }));
    expect(r.fieldErrors?.email).toBeTruthy();
    expect(db.tables.contact_messages).toHaveLength(0);
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("a header-injection attempt in the name is rejected", async () => {
    const r = await submitContactFormAction({}, form({ ...valid, name: "Eve\r\nBcc: attacker@evil.test" }));
    expect(r.fieldErrors?.name).toBeTruthy();
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("an over-long message is rejected", async () => {
    const r = await submitContactFormAction({}, form({ ...valid, message: "x".repeat(5001) }));
    expect(r.fieldErrors?.message).toBeTruthy();
  });

  it("honeypot submissions look successful to the bot but store and send nothing", async () => {
    const r = await submitContactFormAction({}, form({ ...valid, website: "http://spam.test" }));
    expect(r).toEqual({ success: true });
    expect(db.tables.contact_messages).toHaveLength(0);
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("rate-limited submissions are refused", async () => {
    h.rate = { ok: false };
    const r = await submitContactFormAction({}, form(valid));
    expect(r.error).toMatch(/Too many/);
    expect(db.tables.contact_messages).toHaveLength(0);
  });

  it("if the message cannot be stored the visitor gets an error, not success, and no email is queued", async () => {
    db.failNext("contact_messages", "insert", { message: "db down" });
    const r = await submitContactFormAction({}, form(valid));
    expect(r.error).toBeTruthy();
    expect(r.success).toBeUndefined();
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("if only the email step fails the message is still safely stored and success means 'received'", async () => {
    h.enqueue.mockResolvedValue({ ok: false, error: "outbox down" });
    const r = await submitContactFormAction({}, form(valid));
    expect(r).toEqual({ success: true });
    expect(db.tables.contact_messages).toHaveLength(1);
    expect(h.after).not.toHaveBeenCalled();
  });

  it("a provider exception during the deferred delivery cannot surface to the visitor or crash the worker", async () => {
    h.process.mockRejectedValue(new Error("provider exploded"));
    const r = await submitContactFormAction({}, form(valid));
    expect(r).toEqual({ success: true });
    await expect(h.after.mock.calls[0][0]()).resolves.toBeUndefined();
  });

  it("when the hourly email budget is exhausted the message is still stored, but no email is queued", async () => {
    h.budget.mockResolvedValue(false);
    const r = await submitContactFormAction({}, form(valid));
    expect(r).toEqual({ success: true });
    expect(db.tables.contact_messages).toHaveLength(1);
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("no valid recipient configured → stored only, nothing queued to an arbitrary address", async () => {
    h.recipient.mockResolvedValue(null);
    const r = await submitContactFormAction({}, form(valid));
    expect(r).toEqual({ success: true });
    expect(h.enqueue).not.toHaveBeenCalled();
  });
});
