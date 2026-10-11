import type { Department } from "@/types/database";
import { neutralDepartmentVisual, resolveDepartmentVisual } from "./department-visuals";
import { resolveLens, type Lens } from "./department-lenses";

/**
 * Presentation model for the homepage 3D glass carousel.
 *
 * The carousel is only a presentation layer: it consumes the same department
 * data (CMS order preserved) and the same image/lens resolvers as the
 * /departments directory. It appends ONE explicit `future` placeholder — an
 * empty piece of glass reserved for a department that does not exist yet.
 * To fill it later, create the department in Admin: it becomes a normal item
 * and the placeholder simply stays after it.
 */
export type CarouselDepartmentItem = {
  kind: "department";
  key: string;
  name: string;
  tagline: string | null;
  href: string;
  src: string;
  objectPosition: string;
  lens: Lens;
};
export type CarouselFutureItem = { kind: "future"; key: "future" };
export type CarouselItem = CarouselDepartmentItem | CarouselFutureItem;

export function buildCarouselItems(
  departments: Pick<Department, "slug" | "name" | "tagline">[],
): CarouselItem[] {
  const items: CarouselItem[] = departments.map((d) => {
    const own = resolveDepartmentVisual(d);
    const photo = own && own.src ? { src: own.src, objectPosition: own.objectPosition } : neutralDepartmentVisual(d);
    return {
      kind: "department",
      key: d.slug,
      name: d.name,
      tagline: d.tagline ?? null,
      href: `/departments/${d.slug}`,
      src: photo.src,
      objectPosition: photo.objectPosition,
      lens: resolveLens(d),
    };
  });
  items.push({ kind: "future", key: "future" });
  return items;
}

/**
 * Cylinder radius as a multiple of panel width so adjacent slabs just clear
 * each other (gap factor 1.45 — spreads the ring so several panels read at once). Degenerate rings (<3 panels) get a fixed value.
 */
export function ringRadiusFactor(n: number, gap = 1.45): number {
  if (n < 3) return 0.62;
  return gap / 2 / Math.tan(Math.PI / n);
}

/** Wrap any angle into (-180, 180]. */
export function shortestAngle(deg: number): number {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

/** Index of the panel currently facing the viewer for a ring angle. */
export function frontIndex(angle: number, n: number): number {
  if (n <= 0) return 0;
  const i = Math.round(angle / (360 / n)) % n;
  return (i + n) % n;
}
