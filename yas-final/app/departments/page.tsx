import Link from "next/link";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listDepartments } from "@/lib/queries/departments";

export const metadata = { title: "Departments" };

const FALLBACK_DEPARTMENTS = [
  { slug: "moot", name: "Moot", tagline: "Advocacy training through competitive arbitration moots." },
  { slug: "research", name: "Research", tagline: "Scholarship on arbitration and ADR in the Kenyan and East African context." },
  { slug: "csr", name: "CSR", tagline: "Community legal outreach and access-to-justice initiatives." },
  { slug: "conferences", name: "Conferences", tagline: "Convening practitioners, scholars, and institutions." },
  { slug: "partnerships", name: "Partnerships", tagline: "Institutional relationships with firms, chambers, and centres." },
  { slug: "media", name: "Media & Communications", tagline: "The Society's public voice, editorial output, and brand." },
];

export default async function DepartmentsPage() {
  const configured = isSupabaseConfigured();
  const departments = configured
    ? (await listDepartments()).filter((d) => d.status === "published")
    : [];
  const list = departments.length > 0 ? departments : FALLBACK_DEPARTMENTS;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Structure"
        title="Seven departments, one institutional mandate."
        subtitle="Each department operates with its own mandate, leadership, and body of work."
        trail={[{ label: "Departments" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured && (
            <div className="mb-10 rounded-[2px] border border-gold/40 bg-gold/10 px-6 py-5 text-sm text-ink-soft">
              Showing default department copy — connect Supabase to serve
              this from the <code className="text-ink">departments</code> table.
            </div>
          )}
          <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-3">
            {list.map((dept) => (
              <div key={dept.slug} className="flex flex-col gap-3 bg-white p-8">
                <span className="text-xs font-extrabold tracking-wide text-gold">Department</span>
                <h3 className="font-serif text-[1.25rem] font-normal">{dept.name}</h3>
                <p className="flex-1 text-sm leading-relaxed text-ink-soft">{dept.tagline}</p>
                <Link
                  href={`/departments/${dept.slug}`}
                  className="mt-1 inline-flex items-center gap-2 border-b-[1.5px] border-gold pb-1 text-xs font-bold text-navy-deep w-fit"
                >
                  Explore →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
