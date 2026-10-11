import { resolveDepartmentVisual, stableHash, type DepartmentVisualKey } from "./department-visuals";

/**
 * Seven reusable crystal-glass treatments. They are visual lenses, NOT
 * departments: every department the CMS returns, however many there are,
 * receives exactly one lens, and the card architecture is identical.
 *
 * Known departments keep a stable, approved lens. Any other department
 * (for example one an administrator creates later) gets a lens chosen
 * deterministically from its slug, so it needs no developer intervention
 * and keeps the same lens across renders and re-orderings.
 */
export const LENSES = [
  "clear", // Clear Crystal
  "frosted", // Frosted Crystal
  "smoked", // Smoked Crystal
  "champagne", // Champagne Crystal
  "pearl", // Pearl Crystal
  "navy", // Deep Navy Crystal
  "gold", // Antique Gold Crystal
] as const;

export type Lens = (typeof LENSES)[number];

const KNOWN: Record<DepartmentVisualKey, Lens> = {
  research: "clear",
  mooting: "champagne",
  training: "smoked",
  conferences: "pearl",
  publications: "navy",
  csr: "gold",
  "executive-committee": "frosted",
};

export function resolveLens(dept: { slug: string; name: string }): Lens {
  const visual = resolveDepartmentVisual(dept);
  if (visual) return KNOWN[visual.key];
  return LENSES[stableHash(dept.slug || dept.name) % LENSES.length];
}
