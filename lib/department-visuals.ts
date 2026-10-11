/**
 * Department imagery, resolved from department data (slug or name) rather
 * than hard-coded per department. A department whose slug/name matches none
 * of the aliases below simply gets no photograph (the card falls back to its
 * graphic motif), so adding or renaming departments in the CMS never breaks
 * the layout. Each image belongs to exactly one key.
 *
 * Departments with no approved photograph of their own (anything an
 * administrator creates later) get a neutral institutional photograph from
 * a small pool, chosen by a stable hash of the slug — never another
 * department's image, so every card always has a picture.
 *
 * Canonical departments: Research, Mooting, Training, Conferences,
 * Publications, CSR, Executive Committee. Anything else (for example
 * Partnerships or Media & Communications rows left in a database) is
 * intentionally NOT mapped to any of them.
 */
export type DepartmentVisualKey =
  | "research"
  | "mooting"
  | "training"
  | "conferences"
  | "publications"
  | "csr"
  | "executive-committee";

export interface DepartmentVisual {
  key: DepartmentVisualKey;
  /** null = no approved photograph yet; the card keeps its graphic motif. */
  src: string | null;
  /** Focal point for narrow crops (mobile thumbnail). */
  objectPosition: string;
}

const VISUALS: Record<DepartmentVisualKey, Omit<DepartmentVisual, "key">> = {
  research: { src: "/img/departments/research.jpg", objectPosition: "58% 60%" },
  mooting: { src: "/img/departments/mooting.jpg", objectPosition: "50% 55%" },
  training: { src: "/img/departments/training.jpg", objectPosition: "42% 58%" },
  conferences: { src: "/img/departments/conferences.jpg", objectPosition: "45% 55%" },
  publications: { src: "/img/departments/publications.jpg", objectPosition: "42% 62%" },
  csr: { src: "/img/departments/csr.jpg", objectPosition: "50% 58%" },
  "executive-committee": {
    src: "/img/departments/executive-committee.jpg",
    objectPosition: "34% 50%",
  },
};

/** Accepted slugs / slugified names for each visual. */
const ALIASES: Record<DepartmentVisualKey, string[]> = {
  research: ["research"],
  mooting: ["moot", "mooting", "moot-court"],
  training: ["training"],
  conferences: ["conference", "conferences"],
  publications: ["publication", "publications"],
  csr: ["csr"],
  "executive-committee": ["executive", "executive-committee", "exco"],
};

/** FNV-1a — small, stable, dependency-free. */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const NEUTRAL: { src: string; objectPosition: string }[] = [
  { src: "/img/departments/neutral-balance.jpg", objectPosition: "40% 55%" },
  { src: "/img/departments/neutral-globe.jpg", objectPosition: "55% 55%" },
];

/** Always returns a photograph; used when a department has none of its own. */
export function neutralDepartmentVisual(dept: { slug: string; name: string }) {
  return NEUTRAL[stableHash(dept.slug || dept.name) % NEUTRAL.length];
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function matches(candidate: string, alias: string) {
  return candidate === alias || candidate.startsWith(`${alias}-`);
}

export function resolveDepartmentVisual(dept: {
  slug: string;
  name: string;
}): DepartmentVisual | null {
  const candidates = [slugify(dept.slug), slugify(dept.name)];
  for (const key of Object.keys(ALIASES) as DepartmentVisualKey[]) {
    if (ALIASES[key].some((a) => candidates.some((c) => matches(c, a)))) {
      return { key, ...VISUALS[key] };
    }
  }
  return null;
}
