import { describe, it, expect } from "vitest";
import { LENSES, resolveLens } from "./department-lenses";
import { FALLBACK_DEPARTMENTS } from "./departments-fallback";

describe("department lenses", () => {
  it("defines exactly seven lenses", () => {
    expect(new Set(LENSES).size).toBe(7);
  });

  it("gives every current department a lens, all seven used", () => {
    const used = new Set(FALLBACK_DEPARTMENTS.map(resolveLens));
    expect(used.size).toBe(7);
  });

  it("assigns a valid, stable lens to any new CMS department", () => {
    for (const name of ["International Arbitration", "Alumni Relations", "Moot Court Alumni 2031", "X"]) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const lens = resolveLens({ slug, name });
      expect(LENSES).toContain(lens);
      expect(resolveLens({ slug, name })).toBe(lens); // deterministic
    }
  });

  it("supports an unbounded number of departments", () => {
    for (let i = 0; i < 200; i++) {
      expect(LENSES).toContain(resolveLens({ slug: `dept-${i}`, name: `Dept ${i}` }));
    }
  });
});
