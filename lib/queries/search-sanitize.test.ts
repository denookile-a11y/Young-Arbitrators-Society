import { describe, it, expect } from "vitest";
import { toSearchPattern } from "./search-sanitize";

describe("toSearchPattern", () => {
  it("wraps a normal query as an ilike substring pattern", () => {
    expect(toSearchPattern("arbitration")).toBe("%arbitration%");
  });

  it("trims surrounding whitespace", () => {
    expect(toSearchPattern("  arbitration  ")).toBe("%arbitration%");
  });

  it("returns null for an empty string", () => {
    expect(toSearchPattern("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(toSearchPattern("   ")).toBeNull();
  });

  it("strips PostgREST-reserved characters that could break out of a .or() filter", () => {
    // These characters are meaningful in PostgREST's filter query syntax
    // (`,` separates conditions, `(` `)` group them). If they passed
    // through untouched, a crafted search term could alter which columns
    // or conditions the query actually applies.
    expect(toSearchPattern("a,b")).toBe("%a b%");
    expect(toSearchPattern("title.eq.x)or(status.eq.draft")).not.toContain("(");
    expect(toSearchPattern("title.eq.x)or(status.eq.draft")).not.toContain(")");
    expect(toSearchPattern("a\\b")).not.toContain("\\");
  });

  it("returns null when a query becomes empty after stripping reserved characters", () => {
    expect(toSearchPattern("(),")).toBeNull();
    expect(toSearchPattern(",,,")).toBeNull();
  });

  it("leaves ordinary punctuation and unicode untouched", () => {
    expect(toSearchPattern("dispute-resolution")).toBe("%dispute-resolution%");
    expect(toSearchPattern("café")).toBe("%café%");
  });
});
