/**
 * Hand-written to match supabase/migrations/*.sql exactly, since this
 * environment has no live Supabase project to run `supabase gen types
 * typescript` against.
 *
 * ONCE A REAL PROJECT EXISTS, REGENERATE THIS FILE FOR REAL with:
 *   supabase gen types typescript --project-id <ref> > types/database.ts
 * and diff it against this file — they should match if the migrations ran
 * cleanly, but the generated file is the source of truth from that point on.
 */

export type ContentStatus = "draft" | "review" | "published" | "archived";
export type AdminRole = "super_admin" | "admin" | "editor" | "department_admin";
export type MootDocumentKind =
  | "problem"
  | "procedural_order"
  | "authorities"
  | "memorial"
  | "schedule"
  | "results"
  | "report"
  | "other";
export type GalleryItemKind = "image" | "video";

interface Timestamped {
  created_at: string;
  updated_at: string;
}

export interface Edition {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  full_name: string;
  role: AdminRole;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface Department extends Timestamped {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  mandate: string | null;
  status: ContentStatus;
  order_index: number;
}

export interface Profile extends Timestamped {
  id: string;
  slug: string;
  full_name: string;
  portrait_url: string | null;
  bio: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  status: ContentStatus;
}

export interface Member extends Timestamped {
  id: string;
  full_name: string;
  email: string;
  year_of_study: string | null;
  edition_id: string | null;
  joined_at: string;
  status: ContentStatus;
}

export interface LeadershipRole extends Timestamped {
  id: string;
  edition_id: string;
  profile_id: string;
  role_title: string;
  department_id: string | null;
  is_executive: boolean;
  order_index: number;
  status: ContentStatus;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  profile_id: string;
  edition_id: string;
  title: string | null;
  order_index: number;
  created_at: string;
}

interface ContentBase extends Timestamped {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  featured: boolean;
  edition_id: string | null;
  order_index: number;
}

export interface Announcement extends ContentBase {
  body: string | null;
  category: string | null;
  publish_at: string | null;
  expires_at: string | null;
}

export interface Event extends ContentBase {
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  registration_url: string | null;
  cover_image_url: string | null;
}

export interface ProgrammeItem {
  time: string;
  title: string;
  location?: string;
}

export interface Conference extends ContentBase {
  theme: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  programme: ProgrammeItem[] | null;
  registration_url: string | null;
  report_url: string | null;
  cover_image_url: string | null;
}

export interface ConferenceSpeaker {
  id: string;
  conference_id: string;
  profile_id: string | null;
  display_name: string | null;
  role_title: string | null;
  organisation: string | null;
  photo_url: string | null;
  order_index: number;
}

export interface MootResults {
  winner?: string;
  runner_up?: string;
  best_advocate?: string;
  [key: string]: string | undefined;
}

export interface Moot extends ContentBase {
  theme: string | null;
  description: string | null;
  problem_summary: string | null;
  year: number;
  registration_opens_at: string | null;
  competition_starts_at: string | null;
  results: MootResults | null;
  winning_team: string | null;
}

export interface MootDocument {
  id: string;
  moot_id: string;
  kind: MootDocumentKind;
  title: string;
  file_url: string;
  order_index: number;
  created_at: string;
}

export interface Research extends ContentBase {
  abstract: string | null;
  authors: string[];
  category: string | null;
  topic: string | null;
  tags: string[];
  cover_image_url: string | null;
  pdf_url: string | null;
  published_on: string | null;
}

export interface ResearchDocument {
  id: string;
  research_id: string;
  title: string;
  file_url: string;
  order_index: number;
  created_at: string;
}

export interface CsrProject extends ContentBase {
  description: string | null;
  location: string | null;
  partner_org: string | null;
  impact_stats: Record<string, number> | null;
  cover_image_url: string | null;
}

export interface Publication extends ContentBase {
  excerpt: string | null;
  body: string | null;
  category: string | null;
  department_id: string | null;
  cover_image_url: string | null;
  published_on: string | null;
}

export interface Partner extends Timestamped {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  status: ContentStatus;
  featured: boolean;
  order_index: number;
}

export interface Gallery extends Timestamped {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  event_id: string | null;
  conference_id: string | null;
  moot_id: string | null;
  csr_project_id: string | null;
  status: ContentStatus;
  featured: boolean;
  order_index: number;
}

export interface GalleryItem {
  id: string;
  gallery_id: string;
  kind: GalleryItemKind;
  file_url: string;
  caption: string | null;
  taken_on: string | null;
  order_index: number;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: string | null;
}

export interface TimelineEntry extends Timestamped {
  id: string;
  edition_id: string | null;
  year_label: string;
  title: string;
  description: string | null;
  order_index: number;
  status: ContentStatus;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Minimal Supabase `Database` generic shape. This is intentionally loose
 * (not the full `Json`-typed, relationship-aware shape the CLI generates)
 * since it's hand-written — sufficient for typed `.from("table")` calls
 * throughout lib/queries, but replace with the real generated file once a
 * live project exists.
 */
export interface Database {
  public: {
    Tables: {
      editions: { Row: Edition; Insert: Partial<Edition>; Update: Partial<Edition> };
      admins: { Row: Admin; Insert: Partial<Admin>; Update: Partial<Admin> };
      site_settings: { Row: SiteSetting; Insert: Partial<SiteSetting>; Update: Partial<SiteSetting> };
      departments: { Row: Department; Insert: Partial<Department>; Update: Partial<Department> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      members: { Row: Member; Insert: Partial<Member>; Update: Partial<Member> };
      leadership_roles: { Row: LeadershipRole; Insert: Partial<LeadershipRole>; Update: Partial<LeadershipRole> };
      department_members: { Row: DepartmentMember; Insert: Partial<DepartmentMember>; Update: Partial<DepartmentMember> };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> };
      conferences: { Row: Conference; Insert: Partial<Conference>; Update: Partial<Conference> };
      conference_speakers: { Row: ConferenceSpeaker; Insert: Partial<ConferenceSpeaker>; Update: Partial<ConferenceSpeaker> };
      moots: { Row: Moot; Insert: Partial<Moot>; Update: Partial<Moot> };
      moot_documents: { Row: MootDocument; Insert: Partial<MootDocument>; Update: Partial<MootDocument> };
      research: { Row: Research; Insert: Partial<Research>; Update: Partial<Research> };
      research_documents: { Row: ResearchDocument; Insert: Partial<ResearchDocument>; Update: Partial<ResearchDocument> };
      csr_projects: { Row: CsrProject; Insert: Partial<CsrProject>; Update: Partial<CsrProject> };
      publications: { Row: Publication; Insert: Partial<Publication>; Update: Partial<Publication> };
      partners: { Row: Partner; Insert: Partial<Partner>; Update: Partial<Partner> };
      galleries: { Row: Gallery; Insert: Partial<Gallery>; Update: Partial<Gallery> };
      gallery_items: { Row: GalleryItem; Insert: Partial<GalleryItem>; Update: Partial<GalleryItem> };
      newsletter_subscribers: { Row: NewsletterSubscriber; Insert: Partial<NewsletterSubscriber>; Update: Partial<NewsletterSubscriber> };
      timeline_entries: { Row: TimelineEntry; Insert: Partial<TimelineEntry>; Update: Partial<TimelineEntry> };
      contact_messages: { Row: ContactMessage; Insert: Partial<ContactMessage>; Update: Partial<ContactMessage> };
    };
  };
}
