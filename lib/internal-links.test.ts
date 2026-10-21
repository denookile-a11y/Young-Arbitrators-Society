import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const posix = (f: string) => relative(root, f).split(sep).join("/");

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Every route the app can serve, as a regex, built from the app directory itself. */
const routes = walk(join(root, "app"))
  .map(posix)
  .filter((f) => /\/(page|route)\.(tsx|ts)$/.test(f))
  .map((f) => f.replace(/^app/, "").replace(/\/(page|route)\.(tsx|ts)$/, "").replace(/\/\([^/]+\)/g, "") || "/")
  .map((r) => new RegExp("^" + r.split("/").map((s) => (/^\[\.\.\..+\]$/.test(s) ? ".+" : /^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|\\]/g, "\\$&"))).join("/") + "$"));

const sourceFiles = ["app", "components", "lib"]
  .flatMap((d) => walk(join(root, d)))
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f));

/** Internal destinations written as href="/x", href={`/x/${id}`} or { href: "/x" }. */
function internalHrefs(): { file: string; href: string }[] {
  const found: { file: string; href: string }[] = [];
  const re = /href(?:=\{?|:\s*)\s*(["'`])(\/[^"'`]*)\1/g;
  for (const f of sourceFiles) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(re)) {
      const href = m[2].replace(/\$\{[^}]*\}/g, "x").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
      found.push({ file: posix(f), href });
    }
  }
  return found;
}

describe("internal links and public assets resolve", () => {
  const hrefs = internalHrefs();

  it("finds a meaningful number of internal links to check", () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(hrefs.length).toBeGreaterThan(40);
  });

  it("every internal link points to a real route or public file", () => {
    const broken = hrefs.filter(({ href }) => !routes.some((r) => r.test(href)) && !existsSync(join(root, "public", href)));
    expect(broken).toEqual([]);
  });

  it("the leadership biography link shape matches the real dynamic route", () => {
    expect(routes.some((r) => r.test("/leadership/some-person"))).toBe(true);
    for (const f of ["components/home/leadership-section.tsx", "app/leadership/page.tsx", "app/departments/[slug]/page.tsx"]) {
      expect(readFileSync(join(root, f), "utf8"), f).toMatch(/`\/leadership\/\$\{[^}]*slug\}`/);
    }
  });

  it("every /img and /video file referenced from code exists in public/ (case-exact)", () => {
    const missing: string[] = [];
    for (const f of sourceFiles) {
      for (const m of readFileSync(f, "utf8").matchAll(/["'`](\/(?:img|video)\/[A-Za-z0-9._\-/]+\.(?:jpg|jpeg|png|webp|svg|mp4|webm))["'`]/g)) {
        const abs = join(root, "public", m[1]);
        const dir = join(abs, "..");
        const exact = existsSync(dir) && readdirSync(dir).includes(m[1].split("/").pop()!); // catches filename-case mismatches that only fail on Linux hosts
        if (!existsSync(abs) || !exact) missing.push(`${posix(f)} -> ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
