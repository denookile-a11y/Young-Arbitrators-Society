import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getDepartmentBySlug } from "@/lib/queries/departments";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departmentWallpaper } from "@/lib/department-wallpapers";
import { AnnouncementSection } from "@/components/announcements/announcement-list";
import { listDepartmentAnnouncements } from "@/lib/queries/announcements";
import { getCurrentEdition } from "@/lib/queries/leadership";
import { LeadershipPortrait } from "@/components/leadership/leadership-portrait";
import type { LeadershipRole, Profile } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);
  if (!department) return { title: "Departments" };
  return {
    title: department.name,
    description: department.tagline ?? department.mandate ?? undefined,
  };
}

function DepartmentLeaderCard({ role }: { role: DeptMemberRow }) {
  const profile = role.profile;
  const body = (
    <>
      <LeadershipPortrait name={profile?.full_name ?? ""} src={profile?.portrait_url} className="aspect-square" />
      <div className="font-serif text-[1.05rem] font-normal leading-tight group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
        {profile?.full_name ?? "Unassigned"}
      </div>
      <div className="text-xs font-bold text-gold-on-light">{role.role_title}</div>
    </>
  );
  // A leader with a published profile links to their biography; an unassigned role is not a link.
  return profile?.slug ? (
    <Link href={`/leadership/${profile.slug}`} className="group flex flex-col gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-deep">
      {body}
    </Link>
  ) : (
    <div className="flex flex-col gap-2.5">{body}</div>
  );
}

interface DeptMemberRow extends LeadershipRole {
  profile: Profile | null;
}

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);
  if (!department) notFound();

  // Same definition of "current leaders" as /leadership and the homepage: only the current
  // edition. (This query used to span every edition, so past committees appeared here.)
  let roles: DeptMemberRow[] = [];
  try {
    const edition = await getCurrentEdition();
    if (edition) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("leadership_roles")
        .select("*, profile:profiles(*)")
        .eq("department_id", department.id)
        .eq("edition_id", edition.id)
        .eq("status", "published")
        .order("order_index", { ascending: true })
        .returns<DeptMemberRow[]>();
      roles = data ?? [];
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Department page: leadership query failed", (error as Error).message);
  }

  let announcements: Awaited<ReturnType<typeof listDepartmentAnnouncements>> = [];
  let announcementsFailed = false;
  try {
    announcements = await listDepartmentAnnouncements(department.id, 6);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Department page: announcements query failed", (error as Error).message);
    announcementsFailed = true;
  }

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Department"
        title={department.name}
        subtitle={department.tagline ?? undefined}
        trail={[{ label: "Departments", href: "/departments" }, { label: department.name }]}
        image={departmentWallpaper(department)}
      />

      {department.mandate && (
        <section className="px-6 py-18 md:px-10">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
            <div className="border-l-2 border-gold pl-7 font-serif text-[1.3rem] italic font-normal leading-snug text-navy-deep">
              Mandate
            </div>
            <p className="max-w-[560px] text-[1.02rem] leading-relaxed text-ink-soft">{department.mandate}</p>
          </div>
        </section>
      )}

      <AnnouncementSection
        announcements={announcements}
        failed={announcementsFailed}
        eyebrow={`${department.name} announcements`}
        title="Latest updates."
        emptyMessage="There are no announcements for this department right now."
      />

      {roles.length > 0 && (
        <section className="bg-off-white px-6 py-14 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-8 block text-xs font-bold text-gold-on-light">Department Leadership</span>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
              {roles.map((role) => (
                <DepartmentLeaderCard key={role.id} role={role} />
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}
