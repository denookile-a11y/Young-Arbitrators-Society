import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  checkAdmin: vi.fn(),
  request: vi.fn(),
  summary: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ checkAdmin: h.checkAdmin }));
vi.mock("@/lib/newsletter/service", () => ({
  requestLegacyReconsent: h.request,
  getConsentSummary: h.summary,
}));

import { legacyReconsentAction } from "./newsletter-reconsent";
import { RECONSENT_INITIAL_STATE } from "@/lib/newsletter/reconsent-types";

const summary = { confirmed: 1, legacyUnconfirmed: 4, pendingAwaitingConfirmation: 0, unsubscribed: 1 };
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const run = (o: Record<string, string>) => legacyReconsentAction(RECONSENT_INITIAL_STATE, form(o));
const executes = () => h.request.mock.calls.filter((c) => c[0].execute === true);

beforeEach(() => {
  h.checkAdmin.mockReset().mockResolvedValue(null);
  h.summary.mockReset().mockResolvedValue({ ...summary });
  h.request.mockReset().mockImplementation(async (o: { execute: boolean }) =>
    o.execute
      ? { eligible: 4, queued: 4, skipped: 0, failed: 0, stoppedBy: "none" }
      : { eligible: 4, queued: 0, skipped: 0, failed: 0, stoppedBy: "none" }
  );
});

describe("authorisation (server-side, before any service-role code)", () => {
  it("requires the SUPER ADMIN role", async () => {
    await run({ intent: "preview" });
    expect(h.checkAdmin).toHaveBeenCalledWith("super_admin");
  });

  it.each(["preview", "execute"])("an unauthenticated caller cannot %s, and the service is never reached", async (intent) => {
    h.checkAdmin.mockResolvedValue("Not authorised: you must be signed in as an administrator.");
    const r = await run({ intent, confirm: "yes", expectedTotal: "4" });
    expect(r).toMatchObject({ status: "error" });
    expect(h.request).not.toHaveBeenCalled();
    expect(h.summary).not.toHaveBeenCalled();
  });

  it.each(["preview", "execute"])("an authenticated non-super-admin cannot %s", async (intent) => {
    h.checkAdmin.mockResolvedValue("Not authorised: your account does not have permission for this action.");
    const r = await run({ intent, confirm: "yes", expectedTotal: "4" });
    expect(r).toMatchObject({ status: "error" });
    expect(h.request).not.toHaveBeenCalled();
  });
});

describe("preview is a dry run and the default", () => {
  it("never executes: every service call has execute:false", async () => {
    const r = await run({ intent: "preview" });
    expect(r).toMatchObject({ status: "preview", eligibleInBatch: 4, limit: 50, summary });
    expect(h.request.mock.calls.length).toBeGreaterThan(0);
    expect(executes()).toHaveLength(0);
  });

  it("an unknown or missing intent does nothing", async () => {
    expect(await run({ intent: "send" })).toMatchObject({ status: "error" });
    expect(await run({})).toMatchObject({ status: "error" });
    expect(h.request).not.toHaveBeenCalled();
  });

  it("validates and bounds the batch size", async () => {
    for (const bad of ["0", "-5", "7", "101", "1000", "abc", "5e1", "50 "]) {
      h.request.mockClear();
      expect(await run({ intent: "preview", limit: bad })).toMatchObject({ status: "error" });
      expect(h.request).not.toHaveBeenCalled();
    }
    expect(await run({ intent: "preview", limit: "25" })).toMatchObject({ status: "preview", limit: 25 });
  });
});

describe("execution is explicit, separate and checked against the preview", () => {
  const ok = { intent: "execute", confirm: "yes", expectedTotal: "4", limit: "50" };

  it("does not execute without the confirmation field", async () => {
    expect(await run({ ...ok, confirm: "" })).toMatchObject({ status: "error" });
    expect(await run({ intent: "execute", expectedTotal: "4" })).toMatchObject({ status: "error" });
    expect(executes()).toHaveLength(0);
  });

  it("does not execute without a preview's expected total", async () => {
    expect(await run({ intent: "execute", confirm: "yes" })).toMatchObject({ status: "error" });
    expect(await run({ ...ok, expectedTotal: "abc" })).toMatchObject({ status: "error" });
    expect(executes()).toHaveLength(0);
  });

  it("refuses a stale page: if the legacy count changed since the preview, nothing is sent", async () => {
    h.summary.mockResolvedValue({ ...summary, legacyUnconfirmed: 3 });
    const r = await run(ok);
    expect(r).toMatchObject({ status: "error" });
    expect((r as { message: string }).message).toMatch(/changed since your preview/i);
    expect(executes()).toHaveLength(0);
  });

  it("a double submit cannot send a second batch (the count has moved on)", async () => {
    expect(await run(ok)).toMatchObject({ status: "executed", queued: 4 });
    h.summary.mockResolvedValue({ ...summary, legacyUnconfirmed: 0 });
    expect(await run(ok)).toMatchObject({ status: "error" });
    expect(executes()).toHaveLength(1);
  });

  it("executes exactly once, with the bounded limit, and reports counts", async () => {
    const r = await run({ ...ok, limit: "25" });
    expect(executes()).toHaveLength(1);
    expect(executes()[0][0]).toEqual({ execute: true, limit: 25 });
    expect(r).toEqual({ status: "executed", limit: 25, processed: 4, queued: 4, skipped: 0, failed: 0, stoppedBy: "none", summary });
  });

  it("reports partial failures and skipped rows as counts", async () => {
    h.request.mockImplementation(async (o: { execute: boolean }) =>
      o.execute
        ? { eligible: 4, queued: 2, skipped: 1, failed: 1, stoppedBy: "error" }
        : { eligible: 4, queued: 0, skipped: 0, failed: 0, stoppedBy: "none" }
    );
    expect(await run(ok)).toMatchObject({ status: "executed", processed: 4, queued: 2, skipped: 1, failed: 1, stoppedBy: "error" });
  });
});

describe("nothing sensitive reaches the client", () => {
  it("unexpected errors become a generic message (no provider text, token or key)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    h.request.mockRejectedValue(new Error("Resend 401 re_live_SECRET token=abc123 service_role_key"));
    const r = await run({ intent: "preview" });
    expect(r).toMatchObject({ status: "error" });
    const wire = JSON.stringify(r);
    for (const leak of ["Resend", "re_live_SECRET", "abc123", "service_role", "401"]) expect(wire).not.toContain(leak);
    log.mockRestore();
  });

  it("successful results contain only counts, never addresses, tokens or hashes", async () => {
    const wire = JSON.stringify(await run({ intent: "execute", confirm: "yes", expectedTotal: "4" }));
    expect(wire).not.toMatch(/token|hash|@|http/i);
  });

  it("not-configured and unreadable-list cases give fixed messages", async () => {
    h.request.mockResolvedValueOnce({ eligible: 0, queued: 0, skipped: 0, failed: 0, stoppedBy: "not_configured" });
    expect(await run({ intent: "preview" })).toMatchObject({ status: "error", message: expect.stringMatching(/not configured/i) });
    h.request.mockResolvedValueOnce({ eligible: 0, queued: 0, skipped: 0, failed: 0, stoppedBy: "error" });
    expect(await run({ intent: "preview" })).toMatchObject({ status: "error", message: expect.stringMatching(/migration/i) });
  });
});
