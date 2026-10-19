import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(n) && !/\.test\.ts$/.test(n)) out.push(relative(root, p).split(sep).join("/")) // platform-independent (Windows-safe);
  }
  return out;
}
const sources = ["app", "components", "lib"].flatMap((d) => walk(join(root, d)));
const importers = (needle: string) => sources.filter((f) => read(f).includes(needle)).sort();

describe("leadership motion is scoped to Leadership only", () => {
  it("is used by exactly the /leadership page and the profile page", () => {
    const allowed = ["app/leadership/[slug]/page.tsx", "app/leadership/page.tsx"];
    expect(importers("leadership-reveal").filter((f) => !f.startsWith("components/leadership/"))).toEqual(allowed);
    expect(importers("leadership-motion.module.css").filter((f) => !f.startsWith("components/leadership/"))).toEqual(allowed);
  });

  it("is never referenced by the carousel, department components or any shared/global file", () => {
    for (const f of [
      "components/departments/department-carousel.tsx",
      "lib/department-carousel.ts",
      "components/departments/department-showcase.tsx",
      "components/home/leadership-section.tsx",
      "components/ui/page-hero.tsx",
      "app/page.tsx",
      "app/globals.css",
      "app/layout.tsx",
    ]) {
      if (!existsSync(join(root, f))) continue; // a file not present in this tree cannot reference the motion code
      expect(read(f), f).not.toMatch(/leadership-(reveal|motion)|LeadershipReveal/);
    }
  });

  it("uses a CSS Module with no global selectors", () => {
    const css = read("components/leadership/leadership-motion.module.css");
    expect(css).not.toContain(":global");
    const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
    // Every rule header (including those nested in @media); at-rule headers themselves are skipped.
    const selectors = [...body.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim()).filter((h) => !h.startsWith("@"));
    expect(selectors.length).toBeGreaterThan(10);
    for (const s of selectors) for (const part of s.split(",")) {
      expect(part.trim(), part).toMatch(/\.[A-Za-z]/); // always anchored to a local class
      expect(part.trim(), part).not.toMatch(/^(html|body|:root|\*)/);
    }
  });

  it("honours reduced motion and no-JavaScript, and never hides content from assistive tech", () => {
    const css = read("components/leadership/leadership-motion.module.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media \(scripting: none\)/);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/display:\s*none|visibility:\s*hidden/);
    const reveal = read("components/leadership/leadership-reveal.tsx");
    expect(reveal).toContain("prefers-reduced-motion");
    expect(reveal).toContain("IntersectionObserver");
    expect(reveal).not.toMatch(/preventDefault|addEventListener\(["']wheel|addEventListener\(["']scroll/);
  });
});
