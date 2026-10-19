import { describe, it, expect } from "vitest";
import {
  IDENTITIES,
  KNOWN_IDENTITY_KEYS,
  identityStyle,
  resolveDepartmentIdentity,
  type Rgb,
} from "./department-identity";
import { FALLBACK_DEPARTMENTS } from "./departments-fallback";

const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Seeded CMS rows (supabase/seed.sql) that are not in the built-in fallback list.
const SEEDED_EXTRA = [
  { slug: "partnerships", name: "Partnerships" },
  { slug: "media", name: "Media & Communications" },
];
const ALL_KNOWN = [...FALLBACK_DEPARTMENTS, ...SEEDED_EXTRA];

describe("department identities", () => {
  it("defines an explicit identity for all nine known departments", () => {
    expect(KNOWN_IDENTITY_KEYS).toHaveLength(9);
    expect(new Set(ALL_KNOWN.map((d) => resolveDepartmentIdentity(d).key)).size).toBe(9);
  });

  it("gives every known department a unique emblem, primary colour and accent", () => {
    const ids = KNOWN_IDENTITY_KEYS.map((k) => IDENTITIES[k]);
    expect(new Set(ids.map((i) => i.emblem)).size).toBe(ids.length);
    expect(new Set(ids.map((i) => i.primary.join())).size).toBe(ids.length);
    expect(new Set(ids.map((i) => i.accent.join())).size).toBe(ids.length);
  });

  it("keeps accents visibly distinct from one another", () => {
    const ids = KNOWN_IDENTITY_KEYS.map((k) => IDENTITIES[k]);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        expect(dist(ids[i].accent, ids[j].accent), `${ids[i].key} vs ${ids[j].key}`).toBeGreaterThan(60);
  });

  it("resolves by slug or by name, matching the existing visual mapping", () => {
    expect(resolveDepartmentIdentity({ slug: "moot", name: "Moot" }).key).toBe("mooting");
    expect(resolveDepartmentIdentity({ slug: "x", name: "Mooting" }).key).toBe("mooting");
    expect(resolveDepartmentIdentity({ slug: "exco", name: "Executive Committee" }).key).toBe("executive-committee");
    expect(resolveDepartmentIdentity({ slug: "media", name: "Media & Communications" }).key).toBe("media");
    expect(resolveDepartmentIdentity({ slug: "partnerships", name: "Partnerships" }).key).toBe("partnerships");
  });

  it("gives any unexpected record a stable fallback that never reuses a known identity", () => {
    for (const name of ["Alumni Relations", "International Arbitration", "Ethics", "X"]) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const a = resolveDepartmentIdentity({ slug, name });
      expect(a.key.startsWith("fallback-")).toBe(true);
      expect(resolveDepartmentIdentity({ slug, name })).toBe(a);
      expect(KNOWN_IDENTITY_KEYS).not.toContain(a.key);
    }
  });

  it("exposes colours only as CSS custom properties", () => {
    const style = identityStyle(IDENTITIES.mooting) as Record<string, string>;
    expect(Object.keys(style).sort()).toEqual(["--d-1", "--d-2", "--d-hi"]);
    for (const v of Object.values(style)) expect(v).toMatch(/^\d+ \d+ \d+$/);
  });
});
