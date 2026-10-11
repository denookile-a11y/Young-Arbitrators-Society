import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listDepartments } from "@/lib/queries/departments";
import { FALLBACK_DEPARTMENTS } from "@/lib/departments-fallback";
import { departmentHeading } from "@/lib/department-copy";
import { DepartmentShowcase } from "@/components/departments/department-showcase";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const configured = isSupabaseConfigured();
  // The CMS is the source of truth. Built-in defaults are used only when
  // Supabase is not configured; a connected CMS with no published
  // departments shows none.
  const list = configured
    ? (await listDepartments()).filter((d) => d.status === "published")
    : FALLBACK_DEPARTMENTS;

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Structure"
        title={departmentHeading(list.length)}
        subtitle="Each department operates with its own mandate, leadership, and body of work."
        trail={[{ label: "Departments" }]}
        image={{
          src: "/img/wallpaper-ku-amphitheatre.jpg",
          alt: "The Kenyatta University Amphitheatre building",
          focus: "center 40%",
        }}
      />
      <section className="atmosphere px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {!configured && (
            <div className="mb-10 rounded-[2px] glass px-6 py-5 text-sm text-white/80">
              Showing default department copy — connect Supabase to serve
              this from the <code className="text-gold-soft">departments</code> table.
            </div>
          )}
          {list.length > 0 ? (
            <DepartmentShowcase departments={list} />
          ) : (
            <p className="text-center text-sm text-white/80">No departments are published yet.</p>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
