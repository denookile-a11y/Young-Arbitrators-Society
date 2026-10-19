import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as { message: string } | null } }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ from: () => ({ select: () => ({ in: async () => h.result }) }) }),
}));

import { CONTACT_DEFAULTS, getPublicContactSettings } from "./public-settings";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("public contact settings: failed database reads", () => {
  it("at RUNTIME a failed read falls back to the defaults instead of breaking every page", async () => {
    h.result = { data: null, error: { message: "db down" } };
    expect(await getPublicContactSettings()).toEqual(CONTACT_DEFAULTS);
  });

  it("at BUILD time a failed read fails the build rather than baking obsolete defaults into static pages", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    h.result = { data: null, error: { message: "db down" } };
    await expect(getPublicContactSettings()).rejects.toThrow("db down");
  });

  it("when Supabase is not configured at all, defaults are returned (and nothing is queried)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await getPublicContactSettings()).toEqual(CONTACT_DEFAULTS);
  });

  it("a successful read shows the admin's values, including cleared ones", async () => {
    h.result = { data: [{ key: "contact_email", value: "new@yas.test" }, { key: "instagram_handle", value: "" }, { key: "linkedin_url", value: "" }], error: null };
    expect(await getPublicContactSettings()).toEqual({ contactEmail: "new@yas.test", instagramHandle: "", linkedinUrl: "" });
  });
});
