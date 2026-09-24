import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { Pagination } from "@/components/ui/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPaginated, DEFAULT_PAGE_SIZE } from "@/lib/queries/paginated";
import type { CsrProject } from "@/types/database";

export const metadata = { title: "CSR" };

export default async function CsrPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listPaginated<CsrProject>("csr_projects", {
        page,
        eqFilters: [{ column: "status", value: "published" }],
      })
    : { rows: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 1 };
  const projects = result.rows;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Community & Social Responsibility"
        title="Access to justice, beyond the classroom."
        subtitle="Legal education, community outreach, and ADR awareness — where YAS puts advocacy into public service."
        trail={[{ label: "CSR" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured || projects.length === 0 ? (
            <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
              <p className="font-serif text-lg text-navy-deep">
                {configured ? "No published CSR projects yet" : "Waiting for a database connection"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Community projects published through the CMS will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex flex-col gap-3 bg-white p-8">
                    <span className="text-xs font-extrabold tracking-wide text-gold">
                      {project.location ?? "Community Project"}
                    </span>
                    <h3 className="font-serif text-[1.4rem] font-normal leading-snug">{project.title}</h3>
                    {project.description && (
                      <p className="flex-1 text-sm leading-relaxed text-ink-soft">{project.description}</p>
                    )}
                    {project.partner_org && (
                      <span className="text-xs text-ink-soft">In partnership with {project.partner_org}</span>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} basePath="/csr" />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
