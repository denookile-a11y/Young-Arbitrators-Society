import { notFound } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function LeadershipProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Profile>();

  if (!profile) notFound();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Leadership"
        title={profile.full_name}
        trail={[{ label: "Leadership", href: "/leadership" }, { label: profile.full_name }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-14 md:grid-cols-[300px_1fr]">
          <div className="aspect-[3/3.6] bg-gradient-to-br from-navy-mid to-navy-deep" />
          <div className="max-w-[560px] space-y-6">
            {profile.bio && <p className="text-[1.02rem] leading-relaxed text-ink-soft">{profile.bio}</p>}
            <div className="flex flex-wrap gap-4 text-sm">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="text-navy-deep underline">
                  {profile.email}
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-navy-deep underline">
                  LinkedIn
                </a>
              )}
              {profile.twitter_url && (
                <a href={profile.twitter_url} target="_blank" rel="noreferrer" className="text-navy-deep underline">
                  Twitter/X
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
