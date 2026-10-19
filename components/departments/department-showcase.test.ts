import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DepartmentShowcase, departmentDescription } from "./department-showcase";
import { FALLBACK_DEPARTMENTS, type DepartmentSummary } from "@/lib/departments-fallback";

const EXTRA: DepartmentSummary[] = [
  { slug: "partnerships", name: "Partnerships", tagline: "Institutional relationships with firms and centres.", mandate: null },
  { slug: "media", name: "Media & Communications", tagline: null, mandate: "Manages editorial output. It also runs the brand." },
];
const ALL = [...FALLBACK_DEPARTMENTS, ...EXTRA];

const html = renderToStaticMarkup(createElement(DepartmentShowcase, { departments: ALL, leadBadge: "Registration open" }));
const tiles = html.match(/<a [^>]*class="dept-id[^>]*>/g) ?? [];

describe("department showcase tiles", () => {
  it("renders exactly one tile per department", () => {
    expect(tiles).toHaveLength(ALL.length);
  });

  it("links every tile to its existing /departments/<slug> route", () => {
    for (const d of ALL) expect(html).toContain(`href="/departments/${d.slug}"`);
  });

  it("gives every tile a distinct identity", () => {
    const ids = tiles.map((t) => t.match(/data-identity="([^"]+)"/)?.[1]);
    expect(new Set(ids).size).toBe(ALL.length);
  });

  it("shows the real department names and has no nested interactive elements", () => {
    for (const d of ALL) expect(html).toContain(d.name.replace("&", "&amp;"));
    expect((html.match(/<a /g) ?? []).length).toBe(ALL.length);
    expect(html).not.toContain("<button");
  });

  it("derives descriptions from existing copy only, and never invents any", () => {
    expect(departmentDescription(FALLBACK_DEPARTMENTS[2])).toBeNull(); // Training: no approved copy
    expect(departmentDescription(EXTRA[1])).toBe("Manages editorial output.");
    expect(departmentDescription(EXTRA[0])).toBe("Institutional relationships with firms and centres.");
  });

  it("shows the lead badge on Mooting only", () => {
    expect((html.match(/Registration open/g) ?? []).length).toBe(1);
  });

  it("preserves the order supplied", () => {
    const order = ALL.map((d) => html.indexOf(`href="/departments/${d.slug}"`));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
