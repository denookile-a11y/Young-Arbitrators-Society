import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { departmentSchema } from "./validation/content";
import { LENSES, resolveLens } from "./department-lenses";
import { buildCarouselItems } from "./department-carousel";
import { resolveDepartmentVisual } from "./department-visuals";

/**
 * An administrator can add any department through the existing Admin form.
 * These tests run the real Admin validator on form-shaped input and check the
 * public presentation needs no code change to show the new record.
 */
describe("a department created in Admin needs no frontend change", () => {
  const fromForm = (over: Record<string, unknown>) =>
    departmentSchema.safeParse({ slug: "x", name: "X", status: "published", order_index: 0, ...over });

  it.each([
    ["international-arbitration", "International Arbitration"],
    ["technology-innovation", "Technology & Innovation"],
    ["alumni-relations", "Alumni Relations"],
  ])("%s is accepted, gets a lens, a neutral photograph and a carousel slot", (slug, name) => {
    const parsed = fromForm({ slug, name, tagline: "A new department.", order_index: "9" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(LENSES).toContain(resolveLens(parsed.data));
    expect(resolveDepartmentVisual(parsed.data)).toBeNull(); // never borrows another department's photo
    const items = buildCarouselItems([{ ...parsed.data, tagline: parsed.data.tagline ?? null }]);
    const dep = items.find((i) => i.kind === "department");
    expect(dep && dep.kind === "department" && dep.name).toBe(name);
    expect(dep && dep.kind === "department" && existsSync(join(process.cwd(), "public", dep.src))).toBe(true);
  });

  it("works for any number of departments, keeping CMS order and one reserved slot", () => {
    for (const n of [1, 4, 7, 10, 15, 20, 40]) {
      const records = Array.from({ length: n }, (_, i) => ({ slug: `dept-${i}`, name: `Department ${i}`, tagline: null }));
      const items = buildCarouselItems(records);
      const deps = items.filter((i) => i.kind === "department");
      expect(deps).toHaveLength(n);
      expect(deps.map((d) => d.key)).toEqual(records.map((r) => r.slug));
      expect(items.filter((i) => i.kind === "future")).toHaveLength(1);
    }
  });
});

describe("CSR photograph", () => {
  // The tree-planting picture is the approved CSR image (owner decision). If it is ever
  // swapped, update both this test and src in lib/department-visuals.ts together.
  it("uses the approved tree-planting photograph, and the file exists", () => {
    const csr = resolveDepartmentVisual({ slug: "csr", name: "CSR" });
    expect(csr?.key).toBe("csr");
    expect(csr?.src).toBe("/img/departments/csr.jpg");
    expect(existsSync(join(process.cwd(), "public/img/departments/csr.jpg"))).toBe(true);
  });
});
