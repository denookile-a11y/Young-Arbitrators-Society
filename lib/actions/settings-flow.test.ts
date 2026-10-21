import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/test/fake-supabase";

const h = vi.hoisted(() => ({
  checkAdmin: vi.fn<() => Promise<string | null>>(),
  client: null as unknown,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: h.revalidatePath,
  revalidateTag: h.revalidateTag,
  updateTag: h.updateTag,
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/auth/require-admin", () => ({ checkAdmin: h.checkAdmin, requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.client }));

import { updateSiteSettingsAction } from "./settings";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const good = { site_title: "YAS", contact_email: "New@YAS-KU.org", instagram_handle: "@new_handle", linkedin_url: "https://linkedin.com/company/yas" };

let db: FakeDb;
beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeDb({ site_settings: [{ key: "contact_email", value: "old@yas-ku.org" }] }, { site_settings: "key" });
  h.client = { auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) }, from: (t: string) => db.from(t) };
  h.checkAdmin.mockResolvedValue(null);
});

describe("updateSiteSettingsAction", () => {
  it("unauthorized callers are refused before any database access or cache invalidation", async () => {
    h.checkAdmin.mockResolvedValue("Not authorised: you must be signed in as an administrator.");
    const r = await updateSiteSettingsAction({}, form(good));
    expect(r.error).toMatch(/Not authorised/);
    expect(db.calls).toHaveLength(0);
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("requires the super_admin role", async () => {
    await updateSiteSettingsAction({}, form(good));
    expect(h.checkAdmin).toHaveBeenCalledWith("super_admin");
  });

  it("rejects invalid input with field errors and writes nothing", async () => {
    const r = await updateSiteSettingsAction({}, form({ ...good, contact_email: "nope", linkedin_url: "http://x.test" }));
    expect(r.fieldErrors).toMatchObject({ contact_email: expect.any(String), linkedin_url: expect.any(String) });
    expect(db.calls).toHaveLength(0);
  });

  it("persists the normalised values (the stored value matches what was submitted) and keeps the update scoped to the four keys", async () => {
    const r = await updateSiteSettingsAction({}, form(good));
    expect(r).toEqual({ success: true });
    const stored = Object.fromEntries(db.tables.site_settings.map((x) => [x.key, x.value]));
    expect(stored).toMatchObject({ contact_email: "new@yas-ku.org", instagram_handle: "new_handle", linkedin_url: "https://linkedin.com/company/yas", site_title: "YAS" });
    expect(db.tables.site_settings).toHaveLength(4); // old contact_email row was updated in place, not duplicated
  });

  it("an empty optional field clears the stored value instead of being skipped", async () => {
    db.tables.site_settings.push({ key: "linkedin_url", value: "https://linkedin.com/company/old" });
    await updateSiteSettingsAction({}, form({ ...good, linkedin_url: "" }));
    expect(db.tables.site_settings.find((x) => x.key === "linkedin_url")?.value).toBe("");
  });

  it("invalidates the cache tag and the whole public layout on success", async () => {
    await updateSiteSettingsAction({}, form(good));
    expect(h.updateTag).toHaveBeenCalledWith("site-settings");
    expect(h.revalidateTag).toHaveBeenCalledWith("site-settings", "max");
    expect(h.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("a database error is reported as an error, not success, and nothing is invalidated", async () => {
    db.failNext("site_settings", "upsert", { message: "permission denied" });
    const r = await updateSiteSettingsAction({}, form(good));
    expect(r.error).toBeTruthy();
    expect(r.success).toBeUndefined();
    expect(r.error).not.toMatch(/permission denied/); // raw DB text is not exposed
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("a write that silently affected zero rows (e.g. filtered by RLS) is NOT reported as success", async () => {
    h.client = {
      auth: { getUser: async () => ({ data: { user: { id: "a" } } }) },
      from: () => ({ upsert: () => ({ select: async () => ({ data: [], error: null }) }) }),
    };
    const r = await updateSiteSettingsAction({}, form(good));
    expect(r.error).toMatch(/could not be saved/i);
    expect(r.success).toBeUndefined();
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });
});
