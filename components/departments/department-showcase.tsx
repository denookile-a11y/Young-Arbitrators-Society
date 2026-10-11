import Image from "next/image";
import Link from "next/link";
import type { DepartmentSummary } from "@/lib/departments-fallback";
import { neutralDepartmentVisual, resolveDepartmentVisual } from "@/lib/department-visuals";
import { resolveLens } from "@/lib/department-lenses";
/**
 * Compact editorial cards, one per department, in the order supplied.
 * Each card is a 16:9 photograph over a short text block on the YAS glass
 * pane. The photograph comes from the department's own data (see
 * lib/department-visuals.ts); a department with no matching photograph keeps
 * its graphic motif in the same frame, so every card has the same footprint.
 *
 * Footprint: 4 across on wide screens, 3 on laptops, 2 on tablets; on phones
 * each card is a slim row (thumbnail + text) so seven departments stay short.
 */
const FOLIO = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function DepartmentCard({
  dept,
  folio,
  badge,
}: {
  dept: DepartmentSummary;
  folio?: string;
  badge?: string;
}) {
  const visual = resolveDepartmentVisual(dept);
  // Every card has a picture: its own, or a neutral institutional one (never another department's).
  const photo =
    visual && visual.src
      ? { src: visual.src, objectPosition: visual.objectPosition }
      : neutralDepartmentVisual(dept);
  const lens = resolveLens(dept);

  return (
    <Link
      href={`/departments/${dept.slug}`}
      data-lens={lens}
      className="dept-tile crystal group relative isolate flex w-full flex-row overflow-hidden text-white sm:w-[calc(50%-0.5rem)] sm:flex-col lg:w-[calc(33.333%-0.84rem)] xl:w-[calc(25%-0.94rem)]"
    >
      {/* Image frame — 16:9 from sm up; a slim thumbnail beside the text on phones. */}
      <div className="relative w-[36%] min-h-[104px] shrink-0 self-stretch overflow-hidden sm:aspect-video sm:min-h-0 sm:w-full sm:self-auto">
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="(min-width: 1280px) 285px, (min-width: 1024px) 300px, (min-width: 640px) 46vw, 36vw"
          style={{ objectPosition: photo.objectPosition }}
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
        />

        {/* Light base grade so the photograph meets the glass; keeps its own lighting. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-deep/40 via-navy-deep/0 to-transparent ring-1 ring-inset ring-white/10"
        />

        {folio && (
          <span
            aria-hidden
            className="absolute left-2 top-2 bg-navy-deep/60 px-2 py-0.5 font-serif text-[0.78rem] italic leading-none crystal-accent sm:left-3 sm:top-3"
          >
            {folio}
          </span>
        )}

        {dept.mandate && (
          <p
            aria-hidden
            className="dept-mandate pointer-events-none absolute inset-0 z-10 overflow-hidden bg-navy-deep/82 p-4 text-[0.8rem] leading-relaxed text-white/90 [-webkit-box-orient:vertical] [-webkit-line-clamp:6]"
          >
            {dept.mandate}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        {badge && (
          <span className="mb-1.5 block text-[0.7rem] font-bold crystal-accent">{badge}</span>
        )}
        <h3 className="font-serif text-[1.3rem] font-normal leading-[1.1] tracking-tight sm:text-[1.5rem]">
          {dept.name}
        </h3>
        {dept.tagline && (
          <p className="mt-2 line-clamp-2 text-[0.82rem] leading-relaxed text-white/75 sm:text-sm">
            {dept.tagline}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-3 pt-3 text-[0.78rem] font-bold crystal-accent">
          Open department
          <span
            aria-hidden
            className="crystal-rule h-px w-5 transition-[width] duration-300 group-hover:w-10 motion-reduce:transition-none"
          />
        </span>
      </div>

    </Link>
  );
}

export function DepartmentShowcase({
  departments,
  leadBadge,
}: {
  departments: DepartmentSummary[];
  /** Optional status line shown on the Mooting card (e.g. "Registration open"). */
  leadBadge?: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:gap-5">
      {departments.map((dept, i) => (
        <DepartmentCard
          key={dept.slug}
          dept={dept}
          folio={FOLIO[i]}
          badge={resolveDepartmentVisual(dept)?.key === "mooting" ? leadBadge : undefined}
        />
      ))}
    </div>
  );
}
