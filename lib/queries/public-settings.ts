import { unstable_cache } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createPublicClient } from "@/lib/supabase/public";

export const SITE_SETTINGS_TAG = "site-settings";

export interface PublicContactSettings {
  contactEmail: string;
  instagramHandle: string;
  linkedinUrl: string;
}

/** Shown only until an admin saves a value; matches the admin form defaults. */
export const CONTACT_DEFAULTS: PublicContactSettings = {
  contactEmail: "info@yas-ku.org",
  instagramHandle: "yas_kusol",
  linkedinUrl: "",
};

type Row = { key: string; value: unknown };

/**
 * Pure mapping from site_settings rows. A key that exists with an empty
 * string means "an admin cleared it" and is honoured (so a removed LinkedIn
 * link disappears); only a key that was never saved falls back to a default.
 */
export function parseContactSettings(rows: Row[]): PublicContactSettings {
  const get = (key: string, fallback: string) => {
    const row = rows.find((r) => r.key === key);
    return row && typeof row.value === "string" ? row.value : fallback;
  };
  const email = get("contact_email", CONTACT_DEFAULTS.contactEmail).trim();
  return {
    contactEmail: email || CONTACT_DEFAULTS.contactEmail, // never render an empty mailto
    instagramHandle: get("instagram_handle", CONTACT_DEFAULTS.instagramHandle).trim().replace(/^@/, ""),
    linkedinUrl: get("linkedin_url", CONTACT_DEFAULTS.linkedinUrl).trim(),
  };
}

const fetchContactSettings = unstable_cache(
  async (): Promise<PublicContactSettings> => {
    const { data, error } = await createPublicClient()
      .from("site_settings")
      .select("key, value")
      .in("key", ["contact_email", "instagram_handle", "linkedin_url"]);
    if (error) throw new Error(error.message);
    return parseContactSettings((data ?? []) as Row[]);
  },
  ["public-contact-settings"],
  { tags: [SITE_SETTINGS_TAG], revalidate: 3600 }
);

/**
 * Public contact details for the footer and /contact. Cached, and
 * invalidated by the settings action via the SITE_SETTINGS_TAG tag. If the
 * database is unreachable the defaults are shown rather than breaking every
 * page that renders the footer.
 */
export async function getPublicContactSettings(): Promise<PublicContactSettings> {
  if (!isSupabaseConfigured()) return CONTACT_DEFAULTS;
  try {
    return await fetchContactSettings();
  } catch (error) {
    // At BUILD time a failed read must fail the build: otherwise the obsolete
    // defaults would be baked into every statically generated page (footer
    // appears on all of them) and stay there until the next revalidation.
    // At RUNTIME a database blip must not break every page, so fall back.
    if (process.env.NEXT_PHASE === "phase-production-build") throw error;
    console.error("getPublicContactSettings failed; using defaults:", (error as Error).message);
    return CONTACT_DEFAULTS;
  }
}
