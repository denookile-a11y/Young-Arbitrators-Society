import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { neutralDepartmentVisual, resolveDepartmentVisual } from "./department-visuals";
import { FALLBACK_DEPARTMENTS } from "./departments-fallback";

const keyOf = (slug: string, name = slug) => resolveDepartmentVisual({ slug, name })?.key ?? null;

describe("department visuals — canonical seven", () => {
  const CANONICAL: [name: string, slug: string, key: string][] = [
    ["Research", "research", "research"],
    ["Mooting", "mooting", "mooting"],
    ["Training", "training", "training"],
    ["Conferences", "conferences", "conferences"],
    ["Publications", "publications", "publications"],
    ["CSR", "csr", "csr"],
    ["Executive Committee", "executive-committee", "executive-committee"],
  ];

  it.each(CANONICAL)("%s resolves to its own visual (by slug and by name)", (name, slug, key) => {
    expect(keyOf(slug, "x")).toBe(key); // slug alone
    expect(keyOf("unknown-slug", name)).toBe(key); // name alone
  });

  it.each([
    ["research", "research"],
    ["moot", "mooting"],
    ["mooting", "mooting"],
    ["training", "training"],
    ["conferences", "conferences"],
    ["conference", "conferences"],
    ["publications", "publications"],
    ["publication", "publications"],
    ["csr", "csr"],
    ["executive", "executive-committee"],
    ["executive-committee", "executive-committee"],
    ["exco", "executive-committee"],
  ])("alias %s -> %s", (slug, key) => {
    expect(keyOf(slug, "x")).toBe(key);
  });

  it("never maps non-canonical departments to a canonical visual", () => {
    for (const [slug, name] of [
      ["partnerships", "Partnerships"],
      ["media-communications", "Media & Communications"],
      ["media", "Media & Communications"],
      ["something-new", "Something New"],
    ]) {
      expect(resolveDepartmentVisual({ slug, name })).toBeNull();
    }
  });

  it("uses each photograph for exactly one department, and every file exists", () => {
    const srcs = CANONICAL.map(([, slug]) => resolveDepartmentVisual({ slug, name: "x" })!.src).filter(
      (s): s is string => s !== null,
    );
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const src of srcs) expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
  });

  it("CSR uses the approved tree-planting photograph", () => {
    const csr = resolveDepartmentVisual({ slug: "csr", name: "CSR" });
    expect(csr?.key).toBe("csr");
    expect(csr?.src).toBe("/img/departments/csr.jpg");
    expect(existsSync(join(process.cwd(), "public/img/departments/csr.jpg"))).toBe(true);
  });
});

describe("fallback department list", () => {
  it("is exactly the canonical seven, in canonical order, with every one resolving", () => {
    expect(FALLBACK_DEPARTMENTS.map((d) => d.name)).toEqual([
      "Research",
      "Mooting",
      "Training",
      "Conferences",
      "Publications",
      "CSR",
      "Executive Committee",
    ]);
    for (const d of FALLBACK_DEPARTMENTS) expect(resolveDepartmentVisual(d)).not.toBeNull();
  });
});

describe("every department has a picture", () => {
  it("neutral photos exist on disk and are stable per slug", () => {
    for (const slug of ["international-arbitration", "alumni", "x", "media"]) {
      const a = neutralDepartmentVisual({ slug, name: slug });
      expect(existsSync(join(process.cwd(), "public", a.src))).toBe(true);
      expect(neutralDepartmentVisual({ slug, name: slug })).toBe(a);
    }
  });
});
