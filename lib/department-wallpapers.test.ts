import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { departmentWallpaper } from "./department-wallpapers";
import { resolveDepartmentVisual } from "./department-visuals";
import { WALLPAPERS } from "./wallpapers";

const root = resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// The department list comes from the REAL sources, not a hardcoded copy:
// the seeded departments table plus the in-code fallback list.
const seedBlock = read("supabase/seed.sql");
const seeded = [...seedBlock.slice(seedBlock.indexOf("insert into departments")).split(";")[0].matchAll(/\('([a-z0-9-]+)',\s*'((?:[^']|'')+)'/g)].map((m) => ({ slug: m[1], name: m[2].replace(/''/g, "'") }));
const fallbackSrc = read("lib/departments-fallback.ts");
const fallback = [...fallbackSrc.matchAll(/slug:\s*"([a-z0-9-]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
const all = [...new Map([...seeded, ...fallback].map((d) => [d.slug, d])).values()];

/** Departments still without any wallpaper (none at present): they would get the branded hero, NOT a borrowed image. */
const AWAITING = new Set<string>([]);

describe("department detail-page wallpapers", () => {
  it("found the real department lists", () => {
    expect(seeded.length).toBeGreaterThanOrEqual(6);
    expect(fallback.length).toBeGreaterThanOrEqual(7);
    expect(all.length).toBeGreaterThanOrEqual(9);
  });

  it("every department either has its own wallpaper or is explicitly listed as awaiting one", () => {
    for (const d of all) {
      const w = departmentWallpaper(d);
      if (AWAITING.has(d.slug)) expect(w, `${d.slug} should still be awaiting`).toBeUndefined();
      else expect(w, `${d.slug} has no wallpaper and is not listed as awaiting`).toBeDefined();
    }
  });

  it("no wallpaper is shared between two departments", () => {
    const seen = new Map<string, string>();
    for (const d of all) {
      const w = departmentWallpaper(d);
      if (!w) continue;
      expect(seen.get(w.src), `${d.slug} reuses ${w.src} already used by ${seen.get(w.src)}`).toBeUndefined();
      seen.set(w.src, d.slug);
    }
    expect(seen.size).toBe(all.length - AWAITING.size);
  });

  it("never falls back to the shared neutral images, and never to the homepage wallpaper", () => {
    for (const d of all) {
      const w = departmentWallpaper(d);
      if (w) expect(w.src).not.toMatch(/neutral-|yas-atmosphere|yas-live/);
    }
    expect(departmentWallpaper({ slug: "some-future-department", name: "Some Future Department" })).toBeUndefined();
  });

  it("every assigned file exists, is department-specific, and carries the branded fallback", () => {
    for (const d of all) {
      const w = departmentWallpaper(d);
      if (!w) continue;
      expect(existsSync(join(root, "public", w.src)), w.src).toBe(true);
      // Either a department-specific photograph, or the one registered wallpaper for Partnerships.
      const registered: string[] = [WALLPAPERS.partnershipsDepartment.src, WALLPAPERS.mediaDepartment.src];
      expect(registered.includes(w.src) || /^\/img\/departments\/[a-z-]+\.jpg$/.test(w.src), w.src).toBe(true);
      expect(w.branded).toBe(true);
      expect(w.alt.length).toBeGreaterThan(20);
    }
  });

  it("uses the same mapping as the hub cards and showcase (single source of truth)", () => {
    for (const d of all) {
      const v = resolveDepartmentVisual(d);
      // Same as the hub mapping wherever the hub has a department photograph.
      if (v) expect(departmentWallpaper(d)?.src).toBe(v.src);
      else expect(["partnerships", "media"]).toContain(d.slug); // only these two come from the registry
    }
  });

  it("the detail page selects the wallpaper per department, not one hardcoded image", () => {
    const page = read("app/departments/[slug]/page.tsx");
    expect(page).toContain("departmentWallpaper(department)");
    expect(page).not.toMatch(/image=\{\{\s*src:/);
    expect(page).not.toMatch(/\/img\/departments\//);
  });

  it("the existing department image files are unchanged", () => {
    const frozen: Record<string, string> = JSON.parse(
      read("lib/wallpapers.test.ts").match(/const FROZEN = (\{[\s\S]*?\}) as \{/)![1]
    ).hashes;
    for (const [name, hash] of Object.entries(frozen)) {
      if (!name.startsWith("departments/")) continue;
      expect(createHash("sha256").update(readFileSync(join(root, "public/img", name))).digest("hex"), name).toBe(hash);
    }
  });
});
