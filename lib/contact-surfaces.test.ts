import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}
const files = ["app", "components", "lib"].flatMap((d) => walk(join(root, d)));
// Platform-independent: always a forward-slash path relative to the project root (also on Windows).
const rel = (f: string) => relative(root, f).split(sep).join("/");
const FALLBACK_FILE = "lib/queries/public-settings.ts";

describe("no stale hardcoded contact values can override the admin setting", () => {
  it("the default contact email literal exists in exactly one place (the explicit fallback)", () => {
    const holders = files.filter((f) => readFileSync(f, "utf8").includes("info@yas-ku.org")).map(rel);
    expect(holders).toEqual([FALLBACK_FILE]);
  });
  it("the default Instagram handle literal exists only in that fallback", () => {
    const holders = files.filter((f) => readFileSync(f, "utf8").includes("yas_kusol")).map(rel);
    expect(holders).toEqual([FALLBACK_FILE]);
  });
  it("every public surface that shows contact details reads them from the settings query", () => {
    for (const f of ["components/navigation/site-footer.tsx", "app/contact/page.tsx", "components/legal/legal-document.tsx"]) {
      expect(readFileSync(join(root, f), "utf8"), f).toContain("getPublicContactSettings");
    }
  });
  it("no public page builds a mailto: from a literal address", () => {
    const offenders = files.filter((f) => /mailto:[a-z0-9._-]+@/i.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("admin leadership actions refresh the homepage", () => {
  const src = (f: string) => readFileSync(join(root, f), "utf8");
  const bodies = (f: string) => src(f).split(/export async function /).slice(1);
  it.each(["lib/actions/leadership.ts", "lib/actions/profiles.ts"])("%s: every action that writes revalidates '/'", (f) => {
    for (const body of bodies(f)) {
      if (/\.(insert|update|delete)\(/.test(body)) expect(body.split("\n")[0] + body.includes('revalidatePath("/")')).toMatch(/true$/);
    }
  });
});
