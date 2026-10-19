import type { CSSProperties } from "react";
import { resolveDepartmentVisual, stableHash, type DepartmentVisualKey } from "./department-visuals";

/**
 * Distinct visual IDENTITY for every department: palette + emblem.
 *
 * Single source of truth for department colour. Components never hold colour
 * values; they receive CSS custom properties from `identityStyle()` and the
 * `.dept-id` rules in app/globals.css do the rest. The photograph is resolved
 * separately (lib/department-visuals.ts) and stays supplementary: identity is
 * carried by colour and emblem, so it survives any image.
 *
 * Inventory covered explicitly (stable keys):
 *  - the seven canonical departments: Research, Mooting, Training, Conferences,
 *    Publications, CSR, Executive Committee;
 *  - Partnerships and Media & Communications, which exist as seeded CMS rows
 *    (supabase/seed.sql) but are not in the built-in fallback list.
 * Anything else the CMS returns gets a deterministic fallback identity.
 *
 * Colours are [r, g, b]. primary = deep body tone, secondary = mid tone for
 * borders/ambient light, accent = luminous highlight (emblem, rule, link).
 */
export type Rgb = readonly [number, number, number];

export type EmblemKey =
  | "scales"
  | "book"
  | "network"
  | "megaphone"
  | "group"
  | "quill"
  | "mountain"
  | "columns"
  | "rings"
  | "seal";

export type DepartmentIdentityKey =
  | DepartmentVisualKey
  | "partnerships"
  | "media"
  | "fallback-sage"
  | "fallback-pewter"
  | "fallback-sand";

export interface DepartmentIdentity {
  key: DepartmentIdentityKey;
  /** Human description of the palette, for docs and tests. */
  palette: string;
  primary: Rgb;
  secondary: Rgb;
  accent: Rgb;
  emblem: EmblemKey;
}

export const IDENTITIES: Record<DepartmentIdentityKey, DepartmentIdentity> = {
  mooting: {
    key: "mooting",
    palette: "Champagne gold and warm bronze",
    primary: [112, 74, 26],
    secondary: [190, 144, 62],
    accent: [240, 214, 160],
    emblem: "scales",
  },
  research: {
    key: "research",
    palette: "Violet and amethyst",
    primary: [70, 36, 130],
    secondary: [136, 88, 212],
    accent: [214, 150, 255],
    emblem: "book",
  },
  conferences: {
    key: "conferences",
    palette: "Emerald and jade",
    primary: [8, 88, 64],
    secondary: [26, 156, 112],
    accent: [130, 236, 160],
    emblem: "network",
  },
  media: {
    key: "media",
    palette: "Magenta and rose",
    primary: [130, 22, 86],
    secondary: [208, 60, 140],
    accent: [255, 150, 198],
    emblem: "megaphone",
  },
  training: {
    key: "training",
    palette: "Cyan and teal",
    primary: [6, 82, 106],
    secondary: [18, 156, 174],
    accent: [90, 226, 238],
    emblem: "group",
  },
  publications: {
    key: "publications",
    palette: "Amber and antique gold",
    primary: [124, 66, 6],
    secondary: [214, 134, 22],
    accent: [255, 176, 46],
    emblem: "quill",
  },
  csr: {
    key: "csr",
    palette: "Coral and burnt orange",
    primary: [140, 40, 22],
    secondary: [226, 94, 54],
    accent: [255, 140, 110],
    emblem: "mountain",
  },
  "executive-committee": {
    key: "executive-committee",
    palette: "Ice blue and silver",
    primary: [34, 62, 112],
    secondary: [132, 172, 218],
    accent: [214, 232, 252],
    emblem: "columns",
  },
  partnerships: {
    key: "partnerships",
    palette: "Indigo and periwinkle",
    primary: [40, 38, 136],
    secondary: [96, 102, 218],
    accent: [132, 160, 255],
    emblem: "rings",
  },
  // Fallback pool for departments an administrator creates later.
  "fallback-sage": {
    key: "fallback-sage",
    palette: "Sage and olive",
    primary: [58, 84, 52],
    secondary: [124, 164, 98],
    accent: [200, 232, 160],
    emblem: "seal",
  },
  "fallback-pewter": {
    key: "fallback-pewter",
    palette: "Pewter and lavender-grey",
    primary: [66, 70, 88],
    secondary: [128, 134, 158],
    accent: [208, 212, 230],
    emblem: "seal",
  },
  "fallback-sand": {
    key: "fallback-sand",
    palette: "Sandstone and linen",
    primary: [92, 80, 62],
    secondary: [160, 144, 112],
    accent: [226, 214, 184],
    emblem: "seal",
  },
};

const FALLBACK_POOL: DepartmentIdentityKey[] = ["fallback-sage", "fallback-pewter", "fallback-sand"];

/** Identities that belong to a specific, known department (excludes the fallback pool). */
export const KNOWN_IDENTITY_KEYS = (Object.keys(IDENTITIES) as DepartmentIdentityKey[]).filter(
  (k) => !k.startsWith("fallback-"),
);

export function resolveDepartmentIdentity(dept: { slug: string; name: string }): DepartmentIdentity {
  const visual = resolveDepartmentVisual(dept);
  if (visual) return IDENTITIES[visual.key];
  const text = `${dept.slug} ${dept.name}`;
  if (/partnership/i.test(text)) return IDENTITIES.partnerships;
  if (/media|communication/i.test(text)) return IDENTITIES.media;
  return IDENTITIES[FALLBACK_POOL[stableHash(dept.slug || dept.name) % FALLBACK_POOL.length]];
}

const triplet = (c: Rgb) => `${c[0]} ${c[1]} ${c[2]}`;

/** CSS custom properties consumed by `.dept-id` in app/globals.css. */
export function identityStyle(identity: DepartmentIdentity): CSSProperties {
  return {
    "--d-1": triplet(identity.primary),
    "--d-2": triplet(identity.secondary),
    "--d-hi": triplet(identity.accent),
  } as CSSProperties;
}
