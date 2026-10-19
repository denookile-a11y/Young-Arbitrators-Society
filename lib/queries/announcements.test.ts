import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "@/lib/test/fake-supabase";

const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.client }));

import { getPublicAnnouncementBySlug, listDepartmentAnnouncements, listGlobalAnnouncements } from "./announcements";

const DEPT_A = "dept-a", DEPT_B = "dept-b";
const row = (slug: string, over: Record<string, unknown> = {}) => ({
  slug, title: slug, status: "published", featured: false, order_index: 0, department_id: null,
  publish_at: null, expires_at: null, created_at: "2026-10-01T00:00:00Z", ...over,
});
const past = "2000-01-01T00:00:00Z";
const future = "2999-01-01T00:00:00Z";

beforeEach(() => {
  const db = createFakeDb({
    announcements: [
      row("global-1"),
      row("global-featured", { featured: true }),
      row("global-draft", { status: "draft" }),
      row("global-scheduled", { publish_at: future }),
      row("global-expired", { expires_at: past }),
      row("dept-a-1", { department_id: DEPT_A }),
      row("dept-a-draft", { department_id: DEPT_A, status: "draft" }),
      row("dept-b-1", { department_id: DEPT_B }),
    ],
  }, {});
  h.client = { from: (t: string) => db.from(t) };
});

describe("public announcement queries", () => {
  it("homepage: only published, live, GLOBAL announcements — no drafts, scheduled, expired or department-specific", async () => {
    const slugs = (await listGlobalAnnouncements()).map((a) => a.slug);
    expect(slugs.sort()).toEqual(["global-1", "global-featured"]);
  });

  it("department page: only that department's published announcements; other departments and drafts do not leak", async () => {
    expect((await listDepartmentAnnouncements(DEPT_A)).map((a) => a.slug)).toEqual(["dept-a-1"]);
    expect((await listDepartmentAnnouncements(DEPT_B)).map((a) => a.slug)).toEqual(["dept-b-1"]);
    expect(await listDepartmentAnnouncements("dept-without-any")).toEqual([]);
  });

  it("orders featured first, then manual order, then newest", async () => {
    const db = createFakeDb({
      announcements: [
        row("old", { created_at: "2026-01-01T00:00:00Z" }),
        row("new", { created_at: "2026-09-01T00:00:00Z" }),
        row("manual-first", { order_index: -1 }),
        row("star", { featured: true, order_index: 9 }),
      ],
    }, {});
    h.client = { from: (t: string) => db.from(t) };
    expect((await listGlobalAnnouncements()).map((a) => a.slug)).toEqual(["star", "manual-first", "new", "old"]);
  });

  it("respects the limit", async () => {
    expect(await listGlobalAnnouncements(1)).toHaveLength(1);
  });

  it("detail page: published and live resolves; draft, scheduled and expired are not found", async () => {
    expect((await getPublicAnnouncementBySlug("global-1"))?.slug).toBe("global-1");
    expect(await getPublicAnnouncementBySlug("global-draft")).toBeNull();
    expect(await getPublicAnnouncementBySlug("global-scheduled")).toBeNull();
    expect(await getPublicAnnouncementBySlug("global-expired")).toBeNull();
    expect(await getPublicAnnouncementBySlug("missing")).toBeNull();
  });

  it("a database error surfaces as an error (so the page can show an error state, not 'empty')", async () => {
    h.client = { from: () => ({ select: () => ({ eq: () => ({ or: () => ({ is: () => ({ order: function () { return this; }, limit: () => ({ returns: async () => ({ data: null, error: { message: "boom" } }) }) }) }) }) }) }) };
    await expect(listGlobalAnnouncements()).rejects.toThrow("boom");
  });
});

describe("announcements on a database that has NOT had migration 007 applied", () => {
  const rows = [{ slug: "old-news", title: "Old news", status: "published", featured: false, order_index: 0, publish_at: null, expires_at: null, created_at: "2026-01-01T00:00:00Z" }];
  const MISSING = { code: "42703", message: "column announcements.department_id does not exist" };

  // Any query that filters on department_id fails exactly as PostgREST does on the old schema.
  function oldSchemaClient(failure: { code?: string; message: string } = MISSING) {
    const chain = (dept: boolean): Record<string, unknown> => ({
      select: () => chain(dept),
      eq: (c: string) => chain(dept || c === "department_id"),
      is: (c: string) => chain(dept || c === "department_id"),
      or: () => chain(dept),
      order: () => chain(dept),
      limit: () => chain(dept),
      returns: async () => (dept ? { data: null, error: failure } : { data: rows, error: null }),
    });
    return { from: () => chain(false) };
  }

  it("the homepage still shows visible announcements instead of 'could not be loaded'", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.client = oldSchemaClient();
    expect((await listGlobalAnnouncements()).map((a) => a.slug)).toEqual(["old-news"]);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/migration 007/);
    warn.mockRestore();
  });

  it("a department page shows nothing (no announcement can belong to a department before the column exists)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.client = oldSchemaClient();
    expect(await listDepartmentAnnouncements("dept-a")).toEqual([]);
    warn.mockRestore();
  });

  it("any OTHER database error is still reported as an error, not silently swallowed", async () => {
    h.client = oldSchemaClient({ code: "08006", message: "connection failure" });
    await expect(listGlobalAnnouncements()).rejects.toThrow("connection failure");
  });
});
