import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const page = readFileSync(join(resolve(import.meta.dirname, ".."), "app/leadership/page.tsx"), "utf8");

describe("/leadership member cards lead to the bio", () => {
  it("imports Link and defines a card that links to /leadership/<slug>", () => {
    expect(page).toContain('import Link from "next/link"');
    expect(page).toMatch(/href=\{`\/leadership\/\$\{slug\}`\}/);
  });
  it("both groups (Executive and Department Heads & Committee) use the linking card with the profile slug", () => {
    // The mapped element is the leadership scroll-reveal wrapper (it carries the key); the card inside it still gets the slug.
    expect(page.match(/<LeadershipReveal key=\{role\.id\}/g)).toHaveLength(2);
    expect(page.match(/<MemberCard slug=\{role\.profile\?\.slug\}/g)).toHaveLength(2);
    expect(page).not.toMatch(/<div key=\{role\.id\} className="flex flex-col gap-(3\.5|2\.5)">/);
  });
  it("a role without a visible profile ('Unassigned') stays a non-interactive block", () => {
    expect(page).toMatch(/if \(!slug\) return <div className=\{className\}>/);
  });
  it("cards are keyboard-focusable and show a hover affordance", () => {
    expect(page).toContain("focus-visible:outline");
    expect(page).toContain("group-hover:underline");
  });
});
