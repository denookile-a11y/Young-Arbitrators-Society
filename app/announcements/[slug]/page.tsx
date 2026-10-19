import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { announcementDate } from "@/components/announcements/announcement-list";
import { getPublicAnnouncementBySlug } from "@/lib/queries/announcements";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type Params = { params: Promise<{ slug: string }> };

// Same shape the admin form enforces for slugs. Anything else cannot exist, so
// answer 404 without touching the database.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 150 || !isSupabaseConfigured()) return { title: "Announcement" };
  const a = await getPublicAnnouncementBySlug(slug).catch(() => null);
  return a ? { title: a.title, description: a.body?.slice(0, 160) } : { title: "Announcement" };
}

export default async function AnnouncementPage({ params }: Params) {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 150) notFound();
  if (!isSupabaseConfigured()) notFound();
  // Drafts, scheduled-for-later and expired announcements resolve to null here
  // (and RLS hides them too), so they 404 rather than leak. A database
  // FAILURE is deliberately NOT caught: it throws to the error boundary (500)
  // instead of being misreported as "not found".
  const a = await getPublicAnnouncementBySlug(slug);
  if (!a) notFound();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={a.category ?? "Announcement"}
        title={a.title}
        subtitle={announcementDate(a)}
        trail={[{ label: "Announcements", href: "/announcements" }, { label: a.title }]}
      />
      <article className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[680px] whitespace-pre-wrap text-[1.03rem] leading-relaxed text-ink-soft">
          {a.body ?? ""}
        </div>
        <div className="mx-auto mt-12 max-w-[680px]">
          <Link href="/announcements" className="text-sm font-bold text-navy-deep underline decoration-gold underline-offset-4">
            ← All announcements
          </Link>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
