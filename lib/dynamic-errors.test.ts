import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

/**
 * A try/catch around a query that reads cookies() swallows Next's internal
 * "this route is dynamic" signal during prerender, baking an ERROR STATE into
 * a static page (found in the production build log for /announcements).
 * Every catch that wraps such a query must call unstable_rethrow first.
 */
describe("catch sites around cookie-reading queries re-throw Next's control-flow errors", () => {
  it.each([
    ["app/announcements/page.tsx", 1],
    ["lib/queries/homepage.ts", 2],
    ["app/departments/[slug]/page.tsx", 1],
  ])("%s", (file, expected) => {
    const src = readFileSync(join(root, file), "utf8");
    expect(src.match(/unstable_rethrow\(error\)/g)?.length ?? 0).toBeGreaterThanOrEqual(expected);
    // and it must come BEFORE the logging/fallback in each catch
    for (const m of src.matchAll(/catch \((?:error)(?:: Error)?\) \{\s*([^\n]*)/g)) expect(m[1]).not.toMatch(/console\./);
  });
});
