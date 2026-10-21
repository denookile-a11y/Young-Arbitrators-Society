import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(import.meta.dirname, "..", p), "utf8");

describe("legal pages", () => {
  it("route files exist", () => {
    expect(existsSync(resolve(import.meta.dirname, "../app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(resolve(import.meta.dirname, "../app/terms/page.tsx"))).toBe(true);
  });

  it("footer links point at /privacy and /terms", () => {
    const footer = read("components/navigation/site-footer.tsx");
    expect(footer).toContain('href="/privacy"');
    expect(footer).toContain('href="/terms"');
  });

  it("privacy page cites Kenyan law and avoids unsupported claims", () => {
    const src = read("app/privacy/page.tsx");
    expect(src).toContain("Data Protection Act, 2019");
    expect(src).toContain("Last updated:");
    expect(src).not.toMatch(/100% secure|fully compliant|ODPC certified|\bISO[ -]?\d/i);
  });

  it("legal pages take the contact address from the site setting instead of hardcoding one", () => {
    const sources = [read("app/privacy/page.tsx"), read("app/terms/page.tsx"), read("components/legal/legal-document.tsx")].join("\n");
    expect(sources.match(/[\w.-]+@[\w-]+\.[\w.]+/g) ?? []).toEqual([]);
    expect(read("components/legal/legal-document.tsx")).toContain("getPublicContactSettings");
  });

  it("terms page cross-references privacy and Kenyan law", () => {
    const src = read("app/terms/page.tsx");
    expect(src).toContain('href="/privacy"');
    expect(src).toContain("laws of Kenya");
  });
});
