import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { LeadershipReveal } from "@/components/leadership/leadership-reveal";
import m from "@/components/leadership/leadership-motion.module.css";
import { heroImage } from "@/lib/wallpapers";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listEditions, getCurrentEdition, listLeadershipRolesForEdition } from "@/lib/queries/leadership";

export const metadata = { title: "Leadership" };

/**
 * A leadership card. When the role has a visible (published) profile the whole
 * card is a link to that person's bio at /leadership/<slug>; a role without a
 * visible profile ("Unassigned") stays a plain, non-interactive block.
 */
function MemberCard({ slug, className, children }: { slug?: string | null; className: string; children: React.ReactNode }) {
  if (!slug) return <div className={className}>{children}</div>;
  return (
    <Link
      href={`/leadership/${slug}`}
      className={`group ${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2c06a]`}
    >
      {children}
    </Link>
  );
}

export default async function LeadershipPage({
  searchParams,
}: {
  searchParams: Promise<{ edition?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { edition: editionId } = await searchParams;

  const editions = configured ? await listEditions() : [];
  const currentEdition = configured ? await getCurrentEdition() : null;
  const activeEdition = editionId
    ? editions.find((e) => e.id === editionId) ?? currentEdition
    : currentEdition;

  const roles =
    configured && activeEdition
      ? (await listLeadershipRolesForEdition(activeEdition.id)).filter(
          (r) => r.status === "published"
        )
      : [];

  const executives = roles.filter((r) => r.is_executive);
  const departmentHeads = roles.filter((r) => !r.is_executive);

  const stage = heroImage("leadershipIndex");

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Governance"
        title="Leadership & Administration"
        subtitle={
          activeEdition
            ? `Meet the ${activeEdition.label} administration.`
            : "Meet the current administration, and browse the archive of past editions."
        }
        trail={[{ label: "Leadership" }]}
        image={stage}
        glass
      />

      <section
        className={`${m.stage} px-6 py-18 md:px-10`}
        style={{ backgroundImage: `url(${stage.src})`, "--pos": stage.focus } as React.CSSProperties}
      >
        <div className="mx-auto max-w-[1240px]">
          {!configured && (
            <div className={`${m.panel} mb-14 !p-0 px-6 py-5`}>
              <p className={`${m.light} text-sm font-semibold`}>
                Running without a live database
              </p>
              <p className={`${m.soft} mt-1 text-sm`}>
                This page queries the <code className={m.gold}>leadership_roles</code> table
                for the current edition — connect Supabase and publish roles
                through the CMS to see them here.
              </p>
            </div>
          )}

          {configured && !activeEdition && (
            <p className={`${m.soft} text-sm`}>No current edition has been set yet.</p>
          )}

          {configured && activeEdition && roles.length === 0 && (
            <p className={`${m.soft} text-sm`}>
              No published leadership roles for {activeEdition.label} yet.
            </p>
          )}

          {executives.length > 0 && (
            <>
              <LeadershipReveal className="mb-4"><span className={`${m.part} block text-xs font-bold ${m.gold}`}>Executive</span></LeadershipReveal>
              <div className="mb-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
                {executives.map((role, i) => (
                  <LeadershipReveal key={role.id} delay={(i % 2) * 90}>
                  <MemberCard slug={role.profile?.slug} className={`flex flex-col gap-3.5 ${m.panel}`}>
                    <div className={`${m.part} ${m.portrait} aspect-[3/3.2] overflow-hidden bg-gradient-to-br from-navy-mid to-navy-deep`}>
                      {role.profile?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={role.profile.portrait_url}
                          alt={role.profile.full_name ?? "Leadership portrait"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className={`${m.part} ${m.i1} font-serif text-[1.5rem] font-normal ${m.light} group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4`}>
                      {role.profile?.full_name ?? "Unassigned"}
                    </div>
                    <div className={`${m.part} ${m.i2} text-xs font-bold ${m.gold}`}>{role.role_title}</div>
                  </MemberCard>
                  </LeadershipReveal>
                ))}
              </div>
            </>
          )}

          {departmentHeads.length > 0 && (
            <>
              <LeadershipReveal className="mb-4"><span className={`${m.part} block text-xs font-bold ${m.gold}`}>Department Heads & Committee</span></LeadershipReveal>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {departmentHeads.map((role, i) => (
                  <LeadershipReveal key={role.id} delay={(i % 4) * 70}>
                  <MemberCard slug={role.profile?.slug} className={`flex flex-col gap-2.5 ${m.panel}`}>
                    <div className={`${m.part} ${m.portrait} aspect-square overflow-hidden bg-gradient-to-br from-navy-mid to-navy-deep`}>
                      {role.profile?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={role.profile.portrait_url}
                          alt={role.profile.full_name ?? "Leadership portrait"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className={`${m.part} ${m.i1} font-serif text-[1.1rem] font-normal leading-tight ${m.light} group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4`}>
                      {role.profile?.full_name ?? "Unassigned"}
                    </div>
                    <div className={`${m.part} ${m.i2} text-xs font-bold ${m.gold}`}>{role.role_title}</div>
                    {role.department && (
                      <div className={`${m.part} ${m.i3} text-xs ${m.soft}`}>{role.department.name}</div>
                    )}
                  </MemberCard>
                  </LeadershipReveal>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}