import { notFound } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { heroImage } from "@/lib/wallpapers";
import { LeadershipReveal } from "@/components/leadership/leadership-reveal";
import m from "@/components/leadership/leadership-motion.module.css";
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

  const stage = heroImage("leadershipProfile");

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Leadership"
        title={profile.full_name}
        trail={[{ label: "Leadership", href: "/leadership" }, { label: profile.full_name }]}
        image={stage}
        glass
      />
      <section
        className={`${m.stage} px-6 py-18 md:px-10`}
        style={{ backgroundImage: `url(${stage.src})`, "--pos": stage.focus } as React.CSSProperties}
      >
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-14 md:grid-cols-[300px_1fr]">
          <LeadershipReveal>
            <div className={`${m.part} ${m.portrait} ${m.panel}`}>
              <div className="aspect-[3/3.6] overflow-hidden rounded-[8px] bg-gradient-to-br from-navy-mid to-navy-deep">
                {profile.portrait_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.portrait_url}
                    alt={profile.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            </div>
          </LeadershipReveal>
          <LeadershipReveal delay={120} className="max-w-[560px]">
            <div className={`${m.part} ${m.glass} space-y-6`}>
            {profile.bio && <p className={`${m.part} ${m.i1} ${m.bio} ${m.light}`}>{profile.bio}</p>}
            <div className={`${m.part} ${m.i2} flex flex-wrap gap-4 text-sm`}>
              {profile.email && (
                <a href={`mailto:${profile.email}`} className={`${m.gold} underline`}>
                  {profile.email}
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className={`${m.gold} underline`}>
                  LinkedIn
                </a>
              )}
              {profile.twitter_url && (
                <a href={profile.twitter_url} target="_blank" rel="noreferrer" className={`${m.gold} underline`}>
                  Twitter/X
                </a>
              )}
            </div>
            </div>
          </LeadershipReveal>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}