/**
 * Default department list, used only when Supabase is not configured or
 * returns no published departments. The CMS controls the real list and its
 * order; this is the canonical seven: Research, Mooting, Training,
 * Conferences, Publications, CSR, Executive Committee.
 *
 * Taglines and mandates are only filled in where approved copy already exists
 * (carried over from supabase/seed.sql). Training, Publications and Executive
 * Committee have no approved copy yet, so they are left empty rather than
 * invented; the CMS supplies the real text.
 */
export interface DepartmentSummary {
  slug: string;
  name: string;
  tagline: string | null;
  mandate?: string | null;
}

export const FALLBACK_DEPARTMENTS: DepartmentSummary[] = [
  {
    slug: "research",
    name: "Research",
    tagline: "Scholarship on arbitration and ADR in the Kenyan and East African context.",
    mandate:
      "Produces papers, case notes, and policy briefs examining arbitration and ADR in the Kenyan and East African context.",
  },
  {
    // Slug kept as "moot" to match the existing seeded row and the /moot routes.
    slug: "moot",
    name: "Mooting",
    tagline: "Advocacy training through competitive arbitration moots.",
    mandate:
      "Designs and administers YAS moot competitions, from problem drafting through to final rounds, training members in written and oral advocacy.",
  },
  { slug: "training", name: "Training", tagline: null, mandate: null },
  {
    slug: "conferences",
    name: "Conferences",
    tagline: "Convening practitioners, scholars, and institutions.",
    mandate:
      "Plans and delivers the annual YAS conference and smaller convenings throughout the year.",
  },
  { slug: "publications", name: "Publications", tagline: null, mandate: null },
  {
    slug: "csr",
    name: "CSR",
    tagline: "Community legal outreach and access-to-justice initiatives.",
    mandate:
      "Runs community engagement initiatives, including the partnership with the Elimu Legal Aid Clinic in Kirinyaga County.",
  },
  { slug: "executive-committee", name: "Executive Committee", tagline: null, mandate: null },
];
