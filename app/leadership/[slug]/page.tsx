import { notFound, unstable_rethrow } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { heroImage } from "@/lib/wallpapers";
import { LeadershipReveal } from "@/components/leadership/leadership-reveal";
import m from "@/components/leadership/leadership-motion.module.css";
import { LeadershipPortrait } from "@/components/leadership/leadership-portrait";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEdition, listLeadershipRolesForEdition } from "@/lib/queries/leadership";
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

  // Position(s) held in the CURRENT edition, from the same source as /leadership and the
  // homepage. A past-edition member simply has no current position to show.
  let position: string | undefined;
  try {
    const edition = await getCurrentEdition();
    if (edition) {
      const held = (await listLeadershipRolesForEdition(edition.id)).filter(
        (r) => r.status === "published" && r.profile?.id === profile.id
      );
      if (held.length > 0) {
        position = held.map((r) => (r.department ? `${r.role_title}, ${r.department.name}` : r.role_title)).join(" · ");
      }
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Leadership profile: could not load position", (error as Error).message);
  }

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Leadership"
        title={profile.full_name}
        subtitle={position}
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
              <LeadershipPortrait name={profile.full_name} src={profile.portrait_url} className="aspect-[3/3.6] rounded-[8px]" />
            </div>
          </LeadershipReveal>
          <LeadershipReveal delay={120} className="max-w-[560px]">
            <div className={`${m.part} ${m.glass} space-y-6`}>
            {profile.bio ? (
              <p className={`${m.part} ${m.i1} ${m.bio} ${m.light}`}>{profile.bio}</p>
            ) : (
              <p className={`${m.part} ${m.i1} ${m.soft} text-sm`}>A biography for this member has not been published yet.</p>
            )}
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