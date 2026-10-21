/**
 * Integration tests against a real PostgREST + PostgreSQL with the project's
 * migrations (001-007) applied and RLS ON. They exercise the SAME query
 * modules the pages use, as an ANONYMOUS visitor, which is what proves the
 * public RLS policies and PostgREST filter syntax — the thing the in-memory
 * unit-test fake cannot prove. Skipped unless YAS_TEST_* variables are set.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.YAS_TEST_SUPABASE_URL;
const ANON = process.env.YAS_TEST_ANON_KEY;
const SERVICE = process.env.YAS_TEST_SERVICE_KEY;
const ADMIN = process.env.YAS_TEST_ADMIN_KEY; // JWT of a seeded super_admin (real RLS applies to it)
const enabled = Boolean(URL_ && ANON && SERVICE && ADMIN);

const h = vi.hoisted(() => ({
  anon: null as unknown,
  admin: null as unknown,
  actor: "anon" as "anon" | "admin",
  tagCache: new Map<string, unknown>(),
  tagIndex: new Map<string, Set<string>>(),
  paths: [] as string[],
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => (h.actor === "admin" ? h.admin : h.anon) }));
vi.mock("@/lib/auth/require-admin", () => ({ checkAdmin: async () => null, requireAdmin: async () => undefined }));
// A faithful stand-in for Next's tagged cache: results are memoised until their tag is invalidated.
vi.mock("next/cache", () => {
  const invalidate = (tag: string) => { for (const k of h.tagIndex.get(tag) ?? []) h.tagCache.delete(k); };
  return {
    unstable_cache: (fn: () => Promise<unknown>, keys: string[], opts: { tags?: string[] } = {}) => async () => {
      const key = keys.join("|");
      if (h.tagCache.has(key)) return h.tagCache.get(key);
      const value = await fn();
      h.tagCache.set(key, value);
      for (const t of opts.tags ?? []) (h.tagIndex.get(t) ?? h.tagIndex.set(t, new Set()).get(t)!).add(key);
      return value;
    },
    updateTag: invalidate,
    revalidateTag: (tag: string) => invalidate(tag),
    revalidatePath: (p: string) => { h.paths.push(p); },
  };
});

const T = "itest-"; // every row this file creates carries this prefix
let svc: SupabaseClient;
const ids: Record<string, string> = {};

async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

describe.skipIf(!enabled)("homepage committee, contact settings and announcements against real PostgREST/RLS", () => {
  const mk = (name: string, over: Record<string, unknown> = {}) => ({ slug: `${T}${name}`, full_name: `Itest ${name}`, status: "published", bio: `Bio of ${name}`, portrait_url: `https://img.test/${name}.jpg`, ...over });
  let pid: (n: string) => string;
  const homepageSlugs = async () => (await (await import("./homepage-leaders")).listHomepageLeaders()).map((l) => l.profile.slug.replace(T, ""));

  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_!);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON!);
    h.anon = createClient(URL_!, ANON!, { auth: { persistSession: false } });
    h.admin = createClient(URL_!, ANON!, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${ADMIN}` } } });
    svc = createClient(URL_!, SERVICE!, { auth: { persistSession: false } });

    // The test owns the "current edition" while it runs; restored in afterAll.
    const prev = (await ok(svc.from("editions").select("id").eq("is_current", true))) as { id: string }[];
    ids.prevCurrent = prev[0]?.id ?? "";
    await svc.from("editions").update({ is_current: false }).eq("is_current", true);
    const eds = (await ok(svc.from("editions").insert([
      { label: `${T}current`, starts_on: "2026-01-01", is_current: true },
      { label: `${T}old`, starts_on: "2020-01-01", is_current: false },
    ]).select("id,label"))) as { id: string; label: string }[];
    ids.cur = eds.find((e) => e.label.endsWith("current"))!.id;
    ids.old = eds.find((e) => e.label.endsWith("old"))!.id;

    const names = ["pres", "vp", "head1", "head2", "member1", "member2", "member3", "member4", "member5", "draftprofile", "draftrole", "oldmember", "dual"];
    const profiles = (await ok(svc.from("profiles").insert(names.map((n) => mk(n, n === "draftprofile" ? { status: "draft" } : n === "member5" ? { portrait_url: null } : {}))).select("id,slug"))) as { id: string; slug: string }[];
    pid = (n) => profiles.find((p) => p.slug === `${T}${n}`)!.id;

    const role = (n: string, over: Record<string, unknown> = {}) => ({ edition_id: ids.cur, profile_id: pid(n), role_title: `Role ${n}`, is_executive: false, order_index: 0, status: "published", ...over });
    await ok(svc.from("leadership_roles").insert([
      role("pres", { is_executive: true, order_index: 1 }),
      role("vp", { is_executive: true, order_index: 2 }),
      role("head1", { order_index: 1 }), role("head2", { order_index: 2 }),
      role("member1", { order_index: 3 }), role("member2", { order_index: 4 }), role("member3", { order_index: 5 }),
      role("member4", { order_index: 6 }), role("member5", { order_index: 7 }),
      role("draftprofile", { is_executive: true }),               // published role, DRAFT profile
      role("draftrole", { status: "draft" }),                      // published profile, DRAFT role
      role("oldmember", { edition_id: ids.old, is_executive: true }), // PREVIOUS edition
      role("dual", { order_index: 8, role_title: "Secretary" }),
      role("dual", { is_executive: true, order_index: 9, role_title: "Treasurer" }),
    ]));
  });

  afterAll(async () => {
    if (!enabled) return;
    await svc.from("leadership_roles").delete().in("edition_id", [ids.cur, ids.old]);
    await svc.from("profiles").delete().like("slug", `${T}%`);
    await svc.from("editions").delete().like("label", `${T}%`);
    if (ids.prevCurrent) await svc.from("editions").update({ is_current: true }).eq("id", ids.prevCurrent);
    await svc.from("announcements").delete().like("slug", `${T}%`);
    await svc.from("site_settings").delete().in("key", ["site_title", "contact_email", "instagram_handle", "linkedin_url"]);
    if (ids.prevSettings) await svc.from("site_settings").insert(JSON.parse(ids.prevSettings));
  });

  it("an anonymous visitor sees ALL current committee members (executives first, then order_index) — 10 people, not 4", async () => {
    // dual holds 2 roles but appears once, under the higher-ranked (executive) role.
    expect(await homepageSlugs()).toEqual(["pres", "vp", "dual", "head1", "head2", "member1", "member2", "member3", "member4", "member5"]);
  });

  it("includes non-executive members (the reported defect) and the person holding two roles once", async () => {
    const slugs = await homepageSlugs();
    for (const nonExec of ["head1", "head2", "member1", "member5"]) expect(slugs).toContain(nonExec);
    expect(slugs.filter((s) => s === "dual")).toHaveLength(1);
  });

  it("excludes the previous edition, the draft profile and the draft role", async () => {
    const slugs = await homepageSlugs();
    for (const hidden of ["oldmember", "draftprofile", "draftrole"]) expect(slugs).not.toContain(hidden);
  });

  it("returns the profile data the section renders: portrait, name, committee role, bio", async () => {
    const { listHomepageLeaders } = await import("./homepage-leaders");
    const { LeadershipSection } = await import("@/components/home/leadership-section");
    const leaders = await listHomepageLeaders();
    const html = renderToStaticMarkup(createElement(LeadershipSection, { leaders }));
    expect(html).toContain("https://img.test/pres.jpg");
    expect(html).toContain("Itest pres");
    expect(html).toContain("Role pres");
    expect(html).toContain("Bio of pres");
    expect(html).toContain(">IM<"); // member5 has no portrait → initials ("Itest member5" → "IM")
  });

  it("admin edits reach the homepage with no deploy: bio, portrait, name, role title and ordering", async () => {
    await svc.from("profiles").update({ bio: "Edited bio", portrait_url: "https://img.test/new.jpg", full_name: "Itest Renamed" }).eq("id", pid("pres"));
    await svc.from("leadership_roles").update({ role_title: "Chairperson" }).eq("profile_id", pid("pres")).eq("edition_id", ids.cur);
    const { listHomepageLeaders } = await import("./homepage-leaders");
    const first = (await listHomepageLeaders())[0];
    expect(first.profile).toMatchObject({ full_name: "Itest Renamed", bio: "Edited bio", portrait_url: "https://img.test/new.jpg" });
    expect(first.role_title).toBe("Chairperson");
    await svc.from("leadership_roles").update({ order_index: 0 }).eq("profile_id", pid("member3")).eq("edition_id", ids.cur);
    expect((await homepageSlugs()).slice(3, 5)).toEqual(["member3", "head1"]);
  });

  it("publishing, unpublishing and adding members changes the homepage immediately", async () => {
    await svc.from("profiles").update({ status: "draft" }).eq("id", pid("head2"));
    expect(await homepageSlugs()).not.toContain("head2");
    await svc.from("profiles").update({ status: "published" }).eq("id", pid("head2"));
    expect(await homepageSlugs()).toContain("head2");
    await svc.from("leadership_roles").update({ status: "draft" }).eq("profile_id", pid("vp")).eq("edition_id", ids.cur);
    expect(await homepageSlugs()).not.toContain("vp");
    await svc.from("leadership_roles").update({ status: "published" }).eq("profile_id", pid("vp")).eq("edition_id", ids.cur);
    await svc.from("leadership_roles").update({ status: "published" }).eq("profile_id", pid("draftrole")).eq("edition_id", ids.cur);
    expect(await homepageSlugs()).toContain("draftrole");
    await svc.from("leadership_roles").update({ status: "draft" }).eq("profile_id", pid("draftrole")).eq("edition_id", ids.cur);
  });

  it("making another edition current swaps the committee; an old edition never leaks in", async () => {
    await svc.from("editions").update({ is_current: false }).eq("id", ids.cur);
    await svc.from("editions").update({ is_current: true }).eq("id", ids.old);
    expect(await homepageSlugs()).toEqual(["oldmember"]);
    await svc.from("editions").update({ is_current: false }).eq("id", ids.old);
    expect(await homepageSlugs()).toEqual([]); // no current edition → nobody
    await svc.from("editions").update({ is_current: true }).eq("id", ids.cur);
    expect((await homepageSlugs()).length).toBe(10);
  });

  it("RLS: an anonymous client cannot read draft profiles or draft roles directly", async () => {
    const anon = h.anon as SupabaseClient;
    expect(await ok(anon.from("profiles").select("slug").like("slug", `${T}draftprofile`))).toEqual([]);
    expect(await ok(anon.from("leadership_roles").select("id").eq("status", "draft").eq("edition_id", ids.cur))).toEqual([]);
  });

  describe("admin contact settings → public site (real RLS, tag-aware cache)", () => {
    const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries({ site_title: "YAS", contact_email: "a@yas.test", instagram_handle: "yas_x", linkedin_url: "https://linkedin.com/company/yas", ...o })) f.set(k, v); return f; };
    const pub = async () => (await import("./public-settings")).getPublicContactSettings();
    const save = async (o: Record<string, string>) => (await import("@/lib/actions/settings")).updateSiteSettingsAction({}, form(o));

    it("saving a new contact email updates the database AND the public read; a direct DB change alone stays cached", async () => {
      const prev = await ok(svc.from("site_settings").select("*").in("key", ["site_title", "contact_email", "instagram_handle", "linkedin_url"]));
      ids.prevSettings = JSON.stringify(prev);
      h.actor = "admin";
      expect(await save({ contact_email: "first@yas.test" })).toEqual({ success: true });
      expect((await pub()).contactEmail).toBe("first@yas.test");

      // Bypass the action: the cache must still serve the old value (proving the cache is real)…
      await svc.from("site_settings").update({ value: "sneaky@yas.test" }).eq("key", "contact_email");
      expect((await pub()).contactEmail).toBe("first@yas.test");
      // …and the action's invalidation is what refreshes it.
      expect(await save({ contact_email: "second@yas.test" })).toEqual({ success: true });
      expect((await pub()).contactEmail).toBe("second@yas.test");
      const stored = (await ok(svc.from("site_settings").select("value").eq("key", "contact_email").single())) as { value: string };
      expect(stored.value).toBe("second@yas.test");
    });

    it("the action revalidates the whole public layout (footer, contact, legal, homepage)", async () => {
      h.paths.length = 0;
      await save({ contact_email: "third@yas.test" });
      expect(h.paths).toContain("/");
      expect(h.paths).toContain("/admin/settings");
    });

    it("clearing a field clears it publicly; it does NOT fall back to the obsolete hardcoded default", async () => {
      await save({ instagram_handle: "yas_x", linkedin_url: "https://linkedin.com/company/yas" });
      expect((await pub()).instagramHandle).toBe("yas_x");
      await save({ instagram_handle: "", linkedin_url: "" });
      const after = await pub();
      expect(after.instagramHandle).toBe("");
      expect(after.linkedinUrl).toBe("");
      expect(after.instagramHandle).not.toBe("yas_kusol");
    });

    it("an invalid email is rejected before the database and changes nothing", async () => {
      const before = (await pub()).contactEmail;
      const r = await save({ contact_email: "not-an-email" });
      expect(r.fieldErrors?.contact_email).toBeTruthy();
      expect((await pub()).contactEmail).toBe(before);
    });

    it("RLS: a visitor-level client cannot change settings, the action reports failure, the public value is untouched", async () => {
      const before = (await pub()).contactEmail;
      h.actor = "anon";
      const r = await save({ contact_email: "attacker@evil.test" });
      h.actor = "admin";
      expect(r.success).toBeUndefined();
      expect(r.error).toBeTruthy();
      expect((await pub()).contactEmail).toBe(before);
      const stored = (await ok(svc.from("site_settings").select("value").eq("key", "contact_email").single())) as { value: string };
      expect(stored.value).toBe(before);
    });

    it("no phone/address setting exists in this schema or admin UI — only email, Instagram and LinkedIn are managed", async () => {
      const keys = ((await ok(svc.from("site_settings").select("key"))) as { key: string }[]).map((k) => k.key);
      expect(keys.filter((k) => /phone|tel|address|postal/i.test(k))).toEqual([]);
    });
  });

  it("announcements: the real PostgREST window filter and scope rules hold for an anonymous visitor", async () => {
    const dept = (await ok(svc.from("departments").select("id").limit(1).single())) as { id: string };
    const day = 86_400_000;
    const iso = (d: number) => new Date(Date.now() + d).toISOString();
    // Every column explicit: a bulk insert of rows with differing keys sends NULL (not the default) for the gaps.
    const row = (slug: string, over: Record<string, unknown> = {}) => ({ slug: `${T}${slug}`, title: slug, status: "published", featured: false, order_index: 0, publish_at: null, expires_at: null, department_id: null, notify_subscribers: false, ...over });
    await ok(svc.from("announcements").insert([
      row("global-live"),
      row("global-featured", { featured: true }),
      row("global-draft", { status: "draft" }),
      row("global-future", { publish_at: iso(day) }),
      row("global-expired", { expires_at: iso(-day) }),
      row("global-window", { publish_at: iso(-day), expires_at: iso(day) }),
      row("dept-live", { department_id: dept.id }),
    ]));
    const { listGlobalAnnouncements, listDepartmentAnnouncements, getPublicAnnouncementBySlug } = await import("./announcements");
    const global = (await listGlobalAnnouncements(50)).map((a) => a.slug).filter((s) => s.startsWith(T));
    expect(global.sort()).toEqual([`${T}global-featured`, `${T}global-live`, `${T}global-window`]);
    expect((await listDepartmentAnnouncements(dept.id, 50)).map((a) => a.slug).filter((s) => s.startsWith(T))).toEqual([`${T}dept-live`]);
    expect(await getPublicAnnouncementBySlug(`${T}global-draft`)).toBeNull();
    expect(await getPublicAnnouncementBySlug(`${T}global-future`)).toBeNull();
    expect(await getPublicAnnouncementBySlug(`${T}global-expired`)).toBeNull();
    expect(await getPublicAnnouncementBySlug(`${T}does-not-exist`)).toBeNull();
    expect((await getPublicAnnouncementBySlug(`${T}global-window`))?.slug).toBe(`${T}global-window`);
  });
});
