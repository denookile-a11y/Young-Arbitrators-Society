import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listEditions, getCurrentEdition, listLeadershipRolesForEdition } from "@/lib/queries/leadership";

export const metadata = { title: "Leadership" };

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
      />

      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured && (
            <div className="mb-14 rounded-[2px] border border-gold/40 bg-gold/10 px-6 py-5">
              <p className="text-sm font-semibold text-navy-deep">
                Running without a live database
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                This page queries the <code className="text-ink">leadership_roles</code> table
                for the current edition — connect Supabase and publish roles
                through the CMS to see them here.
              </p>
            </div>
          )}

          {configured && !activeEdition && (
            <p className="text-sm text-ink-soft">No current edition has been set yet.</p>
          )}

          {configured && activeEdition && roles.length === 0 && (
            <p className="text-sm text-ink-soft">
              No published leadership roles for {activeEdition.label} yet.
            </p>
          )}

          {executives.length > 0 && (
            <>
              <span className="mb-4 block text-xs font-bold text-gold">Executive</span>
              <div className="mb-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
                {executives.map((role) => (
                  <div key={role.id} className="flex flex-col gap-3.5">
                    <div className="aspect-[3/3.2] bg-gradient-to-br from-navy-mid to-navy-deep" />
                    <div className="font-serif text-[1.5rem] font-normal">
                      {role.profile?.full_name ?? "Unassigned"}
                    </div>
                    <div className="text-xs font-bold text-gold">{role.role_title}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {departmentHeads.length > 0 && (
            <>
              <span className="mb-4 block text-xs font-bold text-gold">Department Heads & Committee</span>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {departmentHeads.map((role) => (
                  <div key={role.id} className="flex flex-col gap-2.5">
                    <div className="aspect-square bg-gradient-to-br from-navy-mid to-navy-deep" />
                    <div className="font-serif text-[1.1rem] font-normal leading-tight">
                      {role.profile?.full_name ?? "Unassigned"}
                    </div>
                    <div className="text-xs font-bold text-gold">{role.role_title}</div>
                    {role.department && (
                      <div className="text-xs text-ink-soft">{role.department.name}</div>
                    )}
                  </div>
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
