import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";

const h = vi.hoisted(() => ({
  client: null as unknown,
  checkAdmin: vi.fn<() => Promise<string | null>>(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
  notify: vi.fn(),
  admin: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/server", () => ({ after: h.after }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.client }));
vi.mock("@/lib/auth/current-admin", () => ({ getCurrentAdmin: h.admin, hasRole: (a: { role: string } | null, min: string) => !!a && (min === "admin" ? ["admin", "super_admin"].includes(a.role) : true) }));
vi.mock("@/lib/auth/require-admin", () => ({ checkAdmin: h.checkAdmin }));
vi.mock("@/lib/announcements/notify", () => ({ notifyAndDeliver: h.notify }));

import { createAnnouncementAction, updateAnnouncementAction } from "./announcements";

const form = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };
const base = { slug: "moot-open", title: "Moot open", status: "published" };
let db: FakeDb;

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeDb({ announcements: [] }, {});
  h.client = { from: (t: string) => db.from(t) };
  h.checkAdmin.mockResolvedValue(null);
  h.admin.mockResolvedValue({ role: "admin" });
});

async function run(fn: () => Promise<unknown>) {
  try { return await fn(); } catch (e) { return e instanceof Error && e.message.startsWith("REDIRECT:") ? { redirected: e.message } : Promise.reject(e); }
}

describe("announcement publication workflow", () => {
  it("unauthorized users cannot create announcements", async () => {
    h.checkAdmin.mockResolvedValue("Not authorised");
    const r = (await createAnnouncementAction({}, form(base))) as { error?: string };
    expect(r.error).toMatch(/Not authorised/);
    expect(db.tables.announcements).toHaveLength(0);
    expect(h.after).not.toHaveBeenCalled();
  });

  it("publishing stores department/notify settings, refreshes every public surface and schedules notification after the response", async () => {
    await run(() => createAnnouncementAction({}, form({ ...base, department_id: "123e4567-e89b-42d3-a456-426614174000", notify_subscribers: "on" })));
    expect(db.tables.announcements[0]).toMatchObject({ department_id: "123e4567-e89b-42d3-a456-426614174000", notify_subscribers: true, status: "published" });
    const paths = h.revalidatePath.mock.calls.map((c) => c.join("|"));
    expect(paths).toEqual(expect.arrayContaining(["/", "/announcements", "/announcements/[slug]|page", "/departments/[slug]|page"]));
    expect(h.after).toHaveBeenCalledTimes(1);
    expect(h.notify).not.toHaveBeenCalled(); // deferred: runs after() the response, never blocks publication
    await h.after.mock.calls[0][0]();
    expect(h.notify).toHaveBeenCalledTimes(1);
  });

  it("emailing subscribers is opt-in: unticked stores notify_subscribers=false and a global (null) department", async () => {
    await run(() => createAnnouncementAction({}, form(base)));
    expect(db.tables.announcements[0]).toMatchObject({ notify_subscribers: false, department_id: null });
  });

  it("an email-side failure cannot undo or fail publication", async () => {
    h.notify.mockRejectedValue(new Error("provider down"));
    const result = await run(() => createAnnouncementAction({}, form({ ...base, notify_subscribers: "on" })));
    expect(result).toMatchObject({ redirected: expect.stringContaining("Created successfully") });
    expect(db.tables.announcements).toHaveLength(1);
  });

  it("editing refreshes public pages too", async () => {
    db.tables.announcements.push({ id: "A1", ...base });
    await run(() => updateAnnouncementAction("A1", {}, form({ ...base, title: "Edited" })));
    expect(db.tables.announcements[0].title).toBe("Edited");
    expect(h.revalidatePath).toHaveBeenCalledWith("/announcements");
  });

  it("validation errors save nothing and notify nobody", async () => {
    const r = (await createAnnouncementAction({}, form({ ...base, title: "", department_id: "junk" }))) as { fieldErrors?: Record<string, string> };
    expect(r.fieldErrors?.title).toBeTruthy();
    expect(db.tables.announcements).toHaveLength(0);
    expect(h.after).not.toHaveBeenCalled();
  });

  it("an editor cannot enable subscriber emails (friendly error, nothing saved, nothing scheduled)", async () => {
    h.admin.mockResolvedValue({ role: "editor" });
    const r = (await createAnnouncementAction({}, form({ ...base, notify_subscribers: "on" }))) as { error?: string };
    expect(r.error).toMatch(/Only administrators/);
    expect(db.tables.announcements).toHaveLength(0);
    expect(h.after).not.toHaveBeenCalled();
  });

  it("an editor can still publish normally, and the notify flag is simply left out of the write", async () => {
    h.admin.mockResolvedValue({ role: "editor" });
    await run(() => createAnnouncementAction({}, form(base)));
    expect(db.tables.announcements[0]).not.toHaveProperty("notify_subscribers");
  });

  it("an editor saving an edit cannot cancel an admin's opt-in (flag not overwritten)", async () => {
    db.tables.announcements.push({ id: "A2", ...base, notify_subscribers: true });
    h.admin.mockResolvedValue({ role: "editor" });
    await run(() => updateAnnouncementAction("A2", {}, form({ ...base, title: "Edited by editor" })));
    expect(db.tables.announcements[0]).toMatchObject({ title: "Edited by editor", notify_subscribers: true });
  });

  it("Nairobi wall-clock times are stored as the correct UTC instants", async () => {
    await run(() => createAnnouncementAction({}, form({ ...base, publish_at: "2026-10-12T09:30", expires_at: "2026-10-13T00:00" })));
    expect(db.tables.announcements[0]).toMatchObject({ publish_at: "2026-10-12T06:30:00.000Z", expires_at: "2026-10-12T21:00:00.000Z" });
  });

  it("rejects an expiry that is not after the publish time", async () => {
    const r = (await createAnnouncementAction({}, form({ ...base, publish_at: "2026-10-12T09:30", expires_at: "2026-10-12T09:00" }))) as { fieldErrors?: Record<string, string> };
    expect(r.fieldErrors?.expires_at).toMatch(/after/);
    expect(db.tables.announcements).toHaveLength(0);
  });

  it("rejects an invalid date instead of storing garbage", async () => {
    const r = (await createAnnouncementAction({}, form({ ...base, publish_at: "next tuesday" }))) as { fieldErrors?: Record<string, string> };
    expect(r.fieldErrors?.publish_at).toBeTruthy();
  });
});
