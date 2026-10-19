import Image from "next/image";
import Link from "next/link";
import type { DepartmentSummary } from "@/lib/departments-fallback";
import { neutralDepartmentVisual, resolveDepartmentVisual } from "@/lib/department-visuals";
import { identityStyle, resolveDepartmentIdentity } from "@/lib/department-identity";
import { DepartmentEmblem } from "@/components/departments/department-emblems";

/**
 * One tile per department, in the order supplied (CMS order preserved).
 *
 * Every tile shares one glass architecture (`.dept-id` in app/globals.css);
 * what differs is the department's identity from lib/department-identity.ts:
 * palette, emblem and luminous accent. The photograph (own, or a neutral
 * institutional one: never another department's) is supplementary and sits
 * behind the text on the right, graded into the department's palette.
 *
 * The whole tile is a single link (no nested interactive elements). It lifts
 * and glows on hover and keyboard focus, shows the same affordance on touch
 * without any hover dependency, and respects prefers-reduced-motion.
 *
 * Footprint: 3 across on laptops and up, 2 on tablets, 1 on phones. A final
 * short row is centred.
 */

/** First sentence of a mandate, used only when a department has no tagline. */
function firstSentence(text: string): string {
  const match = text.trim().match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

export function departmentDescription(dept: DepartmentSummary): string | null {
  const tagline = dept.tagline?.trim();
  if (tagline) return tagline;
  const mandate = dept.mandate?.trim();
  return mandate ? firstSentence(mandate) : null;
}

function DepartmentCard({ dept, badge }: { dept: DepartmentSummary; badge?: string }) {
  const identity = resolveDepartmentIdentity(dept);
  const visual = resolveDepartmentVisual(dept);
  const photo =
    visual && visual.src
      ? { src: visual.src, objectPosition: visual.objectPosition }
      : neutralDepartmentVisual(dept);
  const description = departmentDescription(dept);

  return (
    <Link
      href={`/departments/${dept.slug}`}
      data-identity={identity.key}
      style={identityStyle(identity)}
      className="dept-id group w-full text-white sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.84rem)]"
    >
      <div aria-hidden className="dept-id__media">
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 220px, (min-width: 640px) 200px, 45vw"
          style={{ objectPosition: photo.objectPosition }}
          className="object-cover"
        />
      </div>

      {badge && <span className="dept-id__badge">{badge}</span>}

      <div className="dept-id__head">
        <span className="dept-id__emblem">
          <DepartmentEmblem name={identity.emblem} className="h-[55%] w-[55%]" />
        </span>
        <h3 className="dept-id__title font-serif">{dept.name}</h3>
      </div>

      <div className="dept-id__foot">
        {description && <p className="dept-id__desc">{description}</p>}
        <span className="dept-id__cta">
          Explore department
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dept-id__arrow">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
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
  /** Optional status line shown on the Mooting tile (e.g. "Registration open"). */
  leadBadge?: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:gap-5">
      {departments.map((dept) => (
        <DepartmentCard
          key={dept.slug}
          dept={dept}
          badge={resolveDepartmentVisual(dept)?.key === "mooting" ? leadBadge : undefined}
        />
      ))}
    </div>
  );
}
