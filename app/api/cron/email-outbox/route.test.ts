import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({ outbox: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/email/outbox", () => ({ processOutbox: h.outbox }));
vi.mock("@/lib/announcements/notify", () => ({ enqueueDueAnnouncementNotifications: h.notify }));

import { GET } from "./route";

const req = (authorization?: string) =>
  new NextRequest("https://yas.test/api/cron/email-outbox", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  h.outbox.mockResolvedValue({ claimed: 0, sent: 0, retrying: 0, dead: 0 });
  h.notify.mockResolvedValue({ announcements: 0, queued: 0, duplicates: 0 });
});

describe("notification/outbox worker endpoint", () => {
  it("rejects anonymous callers and never runs the workers", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-secret-value");
    expect((await GET(req())).status).toBe(401);
    expect(h.outbox).not.toHaveBeenCalled();
    expect(h.notify).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-secret-value");
    expect((await GET(req("Bearer wrong-secret-of-same-len!"))).status).toBe(401);
  });

  it("fails closed when no secret is configured, even for 'Bearer undefined'", async () => {
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
    expect((await GET(req("Bearer "))).status).toBe(401);
    expect(h.outbox).not.toHaveBeenCalled();
  });

  it("rejects a too-short configured secret", async () => {
    vi.stubEnv("CRON_SECRET", "short");
    expect((await GET(req("Bearer short"))).status).toBe(401);
  });

  it("runs notification fan-out then delivery for the correct secret", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-secret-value");
    const res = await GET(req("Bearer a-long-enough-secret-value"));
    expect(res.status).toBe(200);
    expect(h.notify).toHaveBeenCalledTimes(1);
    expect(h.outbox).toHaveBeenCalledTimes(1);
  });

  it("reports a worker failure without leaking details", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-secret-value");
    h.notify.mockRejectedValue(new Error("secret db detail"));
    const res = await GET(req("Bearer a-long-enough-secret-value"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret db detail");
  });
});
