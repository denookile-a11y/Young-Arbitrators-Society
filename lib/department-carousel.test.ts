import { describe, it, expect } from "vitest";
import { buildCarouselItems, frontIndex, ringRadiusFactor, shortestAngle } from "./department-carousel";
import { FALLBACK_DEPARTMENTS } from "./departments-fallback";

describe("department carousel model", () => {
  it("keeps CMS order and appends exactly one explicit future panel", () => {
    const items = buildCarouselItems(FALLBACK_DEPARTMENTS);
    expect(items.length).toBe(FALLBACK_DEPARTMENTS.length + 1);
    expect(items.slice(0, -1).map((i) => i.key)).toEqual(FALLBACK_DEPARTMENTS.map((d) => d.slug));
    expect(items.at(-1)).toEqual({ kind: "future", key: "future" });
    expect(items.filter((i) => i.kind === "future").length).toBe(1);
  });

  it("gives every real department its own photo or a neutral one, and the future panel none", () => {
    const items = buildCarouselItems([...FALLBACK_DEPARTMENTS, { slug: "new-dept", name: "New Dept", tagline: null }]);
    for (const it of items) {
      if (it.kind === "department") {
        expect(it.src.startsWith("/img/departments/")).toBe(true);
        expect(it.href).toBe(`/departments/${it.key}`);
      } else {
        expect("src" in it).toBe(false);
      }
    }
  });

  it("a newly created department needs no code: it appears before the future panel", () => {
    const items = buildCarouselItems([{ slug: "international-arbitration", name: "International Arbitration", tagline: null }]);
    expect(items.map((i) => i.key)).toEqual(["international-arbitration", "future"]);
  });

  it("ring geometry: neighbours clear each other and angles wrap", () => {
    expect(ringRadiusFactor(8)).toBeGreaterThan(1.2);
    expect(ringRadiusFactor(2)).toBeGreaterThan(0);
    expect(shortestAngle(190)).toBe(-170);
    expect(shortestAngle(-540)).toBe(180);
    expect(frontIndex(0, 8)).toBe(0);
    expect(frontIndex(44, 8)).toBe(1);
    expect(frontIndex(-45, 8)).toBe(7);
    expect(frontIndex(360 * 3 + 90, 8)).toBe(2);
  });
});
