import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugField = z
  .string()
  .min(1, "Slug is required")
  .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only (e.g. my-article-title)");

export const statusEnum = z.enum(["draft", "review", "published", "archived"]);

export const departmentSchema = z.object({
  slug: slugField,
  name: z.string().min(1, "Name is required"),
  tagline: z.string().optional(),
  mandate: z.string().optional(),
  status: statusEnum,
  order_index: z.coerce.number().int().default(0),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const researchSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  abstract: z.string().optional(),
  authors: z
    .string()
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string())),
  category: z.string().optional(),
  topic: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])),
  pdf_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  published_on: z.string().optional(),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type ResearchInput = z.infer<typeof researchSchema>;

export const eventSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  starts_at: z.string().min(1, "Start date/time is required"),
  ends_at: z.string().optional(),
  venue: z.string().optional(),
  registration_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type EventInput = z.infer<typeof eventSchema>;

export const programmeSessionSchema = z.object({
  time: z.string().min(1, "Time is required"),
  title: z.string().min(1, "Session title is required"),
  location: z.string().optional(),
});
export type ProgrammeSessionInput = z.infer<typeof programmeSessionSchema>;

export const programmeSchema = z.array(programmeSessionSchema);

export const conferenceSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  theme: z.string().optional(),
  description: z.string().optional(),
  starts_at: z.string().min(1, "Start date/time is required"),
  ends_at: z.string().optional(),
  venue: z.string().optional(),
  registration_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  report_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type ConferenceInput = z.infer<typeof conferenceSchema>;

export const mootSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  theme: z.string().optional(),
  description: z.string().optional(),
  problem_summary: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  registration_opens_at: z.string().optional(),
  competition_starts_at: z.string().optional(),
  winning_team: z.string().optional(),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type MootInput = z.infer<typeof mootSchema>;

export const publicationSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  category: z.string().optional(),
  department_id: z.string().uuid().optional().or(z.literal("")),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  published_on: z.string().optional(),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type PublicationInput = z.infer<typeof publicationSchema>;

export const csrProjectSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  partner_org: z.string().optional(),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type CsrProjectInput = z.infer<typeof csrProjectSchema>;

export const partnerSchema = z.object({
  slug: slugField,
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logo_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  website_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  tier: z.string().optional(),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});
export type PartnerInput = z.infer<typeof partnerSchema>;

export const announcementSchema = z.object({
  slug: slugField,
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  category: z.string().optional(),
  status: statusEnum,
  featured: z.coerce.boolean().default(false),
  publish_at: z.string().optional(),
  expires_at: z.string().optional(),
  order_index: z.coerce.number().int().default(0),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const profileSchema = z.object({
  slug: slugField,
  full_name: z.string().min(1, "Full name is required"),
  portrait_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  bio: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  linkedin_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  twitter_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: statusEnum,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const leadershipRoleSchema = z.object({
  edition_id: z.string().uuid("Select an edition"),
  profile_id: z.string().uuid("Select a person"),
  role_title: z.string().min(1, "Role title is required"),
  department_id: z.string().uuid().optional().or(z.literal("")),
  is_executive: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
  status: statusEnum,
});
export type LeadershipRoleInput = z.infer<typeof leadershipRoleSchema>;

export const departmentMemberSchema = z.object({
  edition_id: z.string().uuid("Select an edition"),
  profile_id: z.string().uuid("Select a person"),
  // Required for admin+ (they must pick one — department_members always
  // belongs to a department, unlike leadership_roles' optional one), but
  // department_admin's submitted value is discarded and overridden
  // server-side regardless (see lib/auth/department-scope.ts), so the
  // schema only needs to accept a plausible uuid here.
  department_id: z.string().uuid("Select a department"),
  title: z.string().optional().or(z.literal("")),
  order_index: z.coerce.number().int().default(0),
});
export type DepartmentMemberInput = z.infer<typeof departmentMemberSchema>;
