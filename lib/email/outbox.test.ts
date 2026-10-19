import { describe, expect, it, vi } from "vitest";
import { backoffMs, enqueueEmails, processOutboxBatch, type OutboxRow, type OutboxStore } from "./outbox";
import type { EmailSender } from "./provider";
import { createFakeDb } from "@/lib/test/fake-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  id: "r1", kind: "contact", dedupe_key: "contact:1", to_email: "inbox@example.org", reply_to: null,
  subject: "S", text_body: "T", html_body: null, headers: {}, attempts: 1, ...over,
});

function memoryStore(rows: OutboxRow[]) {
  const sent: string[] = [];
  const failed: { id: string; status: string }[] = [];
  const store: OutboxStore = {
    async claimDue() { const due = rows.splice(0, rows.length); return due; },
    async markSent(id) { sent.push(id); },
    async markFailed(id, u) { failed.push({ id, status: u.status }); },
  };
  return { store, sent, failed };
}

describe("outbox delivery", () => {
  it("sends once, using the outbox id as the provider idempotency key", async () => {
    const { store, sent } = memoryStore([row()]);
    const send = vi.fn<EmailSender>(async () => ({ ok: true, id: "p1" }));
    const result = await processOutboxBatch({ store, send });
    expect(result).toMatchObject({ claimed: 1, sent: 1 });
    expect(send.mock.calls[0][0].idempotencyKey).toBe("r1");
    expect(sent).toEqual(["r1"]);
  });

  it("a provider failure is retried (not lost) with backoff, then marked dead after the last attempt", async () => {
    const fail: EmailSender = async () => ({ ok: false, retryable: true, error: "HTTP 503" });
    const first = memoryStore([row({ attempts: 1 })]);
    expect(await processOutboxBatch({ store: first.store, send: fail })).toMatchObject({ retrying: 1, dead: 0 });
    expect(first.failed[0].status).toBe("failed");
    const last = memoryStore([row({ attempts: 5 })]);
    expect(await processOutboxBatch({ store: last.store, send: fail })).toMatchObject({ retrying: 0, dead: 1 });
    expect(last.failed[0].status).toBe("dead");
  });

  it("a permanent provider rejection goes straight to dead", async () => {
    const m = memoryStore([row({ attempts: 1 })]);
    await processOutboxBatch({ store: m.store, send: async () => ({ ok: false, retryable: false, error: "HTTP 422" }) });
    expect(m.failed[0].status).toBe("dead");
  });

  it("nothing due means nothing sent (processing twice cannot resend a delivered email)", async () => {
    const rows = [row()];
    const m = memoryStore(rows);
    const send = vi.fn<EmailSender>(async () => ({ ok: true, id: "p" }));
    await processOutboxBatch({ store: m.store, send });
    await processOutboxBatch({ store: m.store, send }); // store now empty, as after markSent
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("backs off exponentially but is capped", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(2)).toBe(300_000);
    expect(backoffMs(20)).toBe(2 * 60 * 60_000);
  });
});

describe("enqueueEmails dedupe", () => {
  const mail = { kind: "announcement" as const, dedupeKey: "announcement:A:S1", to: "s@x.test", subject: "s", text: "t" };
  it("enqueueing the same logical email twice stores one row", async () => {
    const db = createFakeDb({ email_outbox: [] });
    const client = db as unknown as SupabaseClient;
    expect(await enqueueEmails([mail], client)).toEqual({ ok: true, inserted: 1, duplicates: 0 });
    expect(await enqueueEmails([mail], client)).toEqual({ ok: true, inserted: 0, duplicates: 1 });
    expect(db.tables.email_outbox).toHaveLength(1);
  });
  it("reports a database failure instead of pretending it queued", async () => {
    const db = createFakeDb({ email_outbox: [] });
    db.failNext("email_outbox", "upsert", { message: "db down" });
    expect(await enqueueEmails([mail], db as unknown as SupabaseClient)).toMatchObject({ ok: false });
  });
});
