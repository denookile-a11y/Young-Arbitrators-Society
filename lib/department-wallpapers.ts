import type { PageHeroImage } from "@/components/ui/page-hero";
import { heroImage } from "@/lib/wallpapers";
import { resolveDepartmentVisual, type DepartmentVisualKey } from "@/lib/department-visuals";

/**
 * Wallpaper for an INDIVIDUAL department page (/departments/[slug]).
 *
 * It reuses the department-visuals mapping that already drives the hub cards
 * and showcase (slug / name aliases -> one department-specific photograph), so
 * a department's card photo and its detail hero can never disagree. Rules:
 *  - one department-specific photograph per department; no two departments
 *    share an image (lib/department-wallpapers.test.ts);
 *  - a department with NO department-specific photograph gets `undefined`
 *    (the branded navy hero) — it does NOT fall back to the shared "neutral"
 *    pool, which would repeat images across departments;
 *  - the existing image files and the hub/showcase mapping are not modified.
 */
const ALT: Record<DepartmentVisualKey, string> = {
  research: "A scholar's desk in a book-lined library with an open atlas of Africa and a globe",
  mooting: "A moot courtroom with a brass balance scale on the bench and open case books",
  training: "Open legal volumes, a magnifying glass and a map on a study table in a wood-panelled library",
  conferences: "A conference table set with papers and laptops in a boardroom overlooking Nairobi",
  publications: "Stacks of manuscripts, bound volumes and reading glasses on a writing desk",
  csr: "Volunteers planting trees together in the Kenyan countryside",
  "executive-committee": "Committee members in discussion around a boardroom table beneath a map of Africa",
};

export function departmentWallpaper(dept: { slug: string; name: string }): PageHeroImage | undefined {
  const visual = resolveDepartmentVisual(dept);
  // Partnerships has no entry in the department-visuals mapping; its wallpaper is
  // registered in lib/wallpapers.ts (one image, one destination).
  if (!visual && /partnership/i.test(`${dept.slug} ${dept.name}`)) return heroImage("partnershipsDepartment");
  // Media & Communications likewise: a generated sound-wave graphic registered in lib/wallpapers.ts.
  if (!visual && /media|communication/i.test(`${dept.slug} ${dept.name}`)) return heroImage("mediaDepartment");
  if (!visual || !visual.src) return undefined;
  return { src: visual.src, alt: ALT[visual.key], focus: visual.objectPosition, branded: true };
}
