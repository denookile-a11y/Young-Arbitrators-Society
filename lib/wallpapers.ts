import type { PageHeroImage } from "@/components/ui/page-hero";

/**
 * REGISTER OF NEWLY ASSIGNED WALLPAPERS (single source of truth).
 *
 * Rules this file exists to enforce (see lib/wallpapers.test.ts):
 *  - one image  -> exactly ONE destination; no image is reused on another page;
 *  - one destination -> one image;
 *  - every entry's file exists in /public/img and is not a copy of any other;
 *  - a page uses its wallpaper ONLY through heroImage("<key>").
 *
 * Wallpapers that existed before this register (wallpaper-gavel-scales,
 * wallpaper-justice-statue, wallpaper-ku-*, wallpaper-nairobi-*, etc.) are
 * PROTECTED and are deliberately NOT listed or re-wired here; they stay exactly
 * where each page already references them. The full inventory, rationale and
 * the sections still awaiting a wallpaper are in docs/WALLPAPER_REGISTER.md.
 *
 * To add a wallpaper: copy the file to public/img under a new descriptive name,
 * add ONE entry below for ONE destination, then call heroImage(key) on that
 * page's <PageHero>. The test fails if the image or destination is duplicated.
 *
 * `focus` is the CSS object-position that keeps the subject inside the wide
 * desktop crop (these are portrait photographs) while still working on mobile.
 */
export interface Wallpaper {
  /** Public route (or route template) this image belongs to. */
  destination: string;
  src: string;
  alt: string;
  focus: string;
}

export const WALLPAPERS = {
  mootDetail: {
    destination: "/moot/[slug]",
    src: "/img/wallpaper-moot-evidence-gavel.jpg",
    alt: "A gavel resting on an open volume of civil-procedure rules beside a treatise on evidence",
    focus: "center 80%",
  },
  termsLegal: {
    destination: "/terms",
    src: "/img/wallpaper-terms-lady-justice.jpg",
    alt: "A bronze statue of Lady Justice holding scales and a sword beneath a stormy sky",
    focus: "center 50%",
  },
  conferenceDetail: {
    destination: "/conferences/[slug]",
    src: "/img/wallpaper-conferences-africa-map.jpg",
    alt: "Textured paper artwork of a line of silhouetted figures walking toward a map of Africa at sunset",
    focus: "center 45%",
  },
  eventDetail: {
    destination: "/events/[slug]",
    src: "/img/wallpaper-events-maasai-procession.jpg",
    alt: "A line of people in red shukas walking single file through golden grassland",
    focus: "center 30%",
  },
  researchDetail: {
    destination: "/research/[slug]",
    src: "/img/wallpaper-research-light-rays.jpg",
    alt: "Shafts of golden light breaking through dark storm clouds over the sea",
    focus: "center 24%",
  },
  announcementsIndex: {
    destination: "/announcements",
    src: "/img/wallpaper-announcements-light-bird.jpg",
    alt: "A single bird rising through a column of amber light in a dark sky",
    focus: "center 12%",
  },
  leadershipIndex: {
    destination: "/leadership",
    src: "/img/wallpaper-leadership-cafe-rain.jpg",
    alt: "A steaming cup of coffee on a wooden table beside a rain-streaked window, with warm pendant lamps and a wet city street outside",
    focus: "center 30%",
  },
  leadershipProfile: {
    destination: "/leadership/[slug]",
    src: "/img/wallpaper-leadership-profile-cafe-lights.jpg",
    alt: "A small café table for two beneath hanging amber lanterns, seen through a window onto a rainy tree-lined street",
    focus: "center 24%",
  },
  partnershipsDepartment: {
    destination: "/departments/partnerships",
    src: "/img/wallpaper-partnerships-city-street.jpg",
    alt: "A rain-slicked city street lined with red-leaved trees between glass office towers",
    focus: "center 48%",
  },
  mediaDepartment: {
    destination: "/departments/media",
    src: "/img/wallpaper-media-communications-network.jpg",
    alt: "A glowing dotted map of Africa with fine amber light trails arcing outward to connected hubs across the world",
    focus: "center 58%",
  },
} as const satisfies Record<string, Wallpaper>;

export type WallpaperKey = keyof typeof WALLPAPERS;

/**
 * Backgrounds for the ADMIN area (not public pages, so not rendered through
 * PageHero). Same rules: one image, one destination, never reused.
 *  - login: sits between the existing atmosphere photograph and its existing
 *    overlay gradient, so the original atmosphere remains underneath as the
 *    fallback and text contrast is unchanged;
 *  - dashboard: header banner behind the "Dashboard Overview" title only, never
 *    behind tables or forms.
 */
export const ADMIN_WALLPAPERS = {
  login: {
    destination: "/admin/login",
    src: "/img/admin-login-clock.jpg",
    alt: "A wall clock with Roman numerals in low, warm light",
    focus: "center 38%",
  },
  dashboard: {
    destination: "/admin",
    src: "/img/admin-dashboard-laptop.jpg",
    alt: "A laptop, notebook and coffee on a dark desk at sunrise above a city",
    focus: "center 32%",
  },
} as const satisfies Record<string, Wallpaper>;

/**
 * PageHero image props for a registered wallpaper. `branded` makes PageHero lay
 * its own navy gradient UNDER the photograph, so if the file ever fails to load
 * the section degrades to the site's branded hero instead of white text on a
 * light page (and never borrows another page's wallpaper).
 */
export function heroImage(key: WallpaperKey): PageHeroImage {
  const { src, alt, focus } = WALLPAPERS[key];
  return { src, alt, focus, branded: true };
}
