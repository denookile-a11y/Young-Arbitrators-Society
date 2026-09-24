import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getDepartmentBySlug } from "@/lib/queries/departments";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("leadership_roles")
    .select("*, profile:profiles(*)")
    .eq("department_id", department.id)
    .eq("status", "published")
    .order("order_index", { ascending: true })
    .returns<DeptMemberRow[]>();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Department"
        title={department.name}
        subtitle={department.tagline ?? undefined}
        trail={[{ label: "Departments", href: "/departments" }, { label: department.name }]}
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

      {roles && roles.length > 0 && (
        <section className="bg-off-white px-6 py-14 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-8 block text-xs font-bold text-gold">Department Leadership</span>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
              {roles.map((role) => (
                <div key={role.id} className="flex flex-col gap-2.5">
                  <div className="aspect-square bg-gradient-to-br from-navy-mid to-navy-deep" />
                  <div className="font-serif text-[1.05rem] font-normal leading-tight">
                    {role.profile?.full_name ?? "Unassigned"}
                  </div>
                  <div className="text-xs font-bold text-gold">{role.role_title}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}
