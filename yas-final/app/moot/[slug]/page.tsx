import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import { createClient } from "@/lib/supabase/server";
import type { Moot, MootDocument } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const moot = await getContentBySlug<Moot>("moots", slug);
  if (!moot) return { title: "Moot" };
  return {
    title: moot.title,
    description: moot.description ?? undefined,
  };
}

export default async function MootDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const moot = await getContentBySlug<Moot>("moots", slug);
  if (!moot) notFound();

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("moot_documents")
    .select("*")
    .eq("moot_id", moot.id)
    .order("order_index", { ascending: true })
    .returns<MootDocument[]>();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={`${moot.year}${moot.winning_team ? " · Won by " + moot.winning_team : ""}`}
        title={moot.title}
        subtitle={moot.description ?? undefined}
        trail={[{ label: "Moot", href: "/moot" }, { label: moot.title }]}
      />

      {moot.problem_summary && (
        <section className="px-6 py-18 md:px-10">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
            <div className="border-l-2 border-gold pl-7 font-serif text-[1.3rem] italic font-normal leading-snug text-navy-deep">
              Problem
            </div>
            <p className="max-w-[560px] text-[1.02rem] leading-relaxed text-ink-soft">
              {moot.problem_summary}
            </p>
          </div>
        </section>
      )}

      {documents && documents.length > 0 && (
        <section className="bg-off-white px-6 py-14 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-6 block text-xs font-bold text-gold">Documents</span>
            <div className="border-t border-hairline">
              {documents.map((doc) => (
                <div key={doc.id} className="grid grid-cols-[140px_1fr_auto] items-center gap-6 border-b border-hairline py-5">
                  <span className="text-xs font-extrabold tracking-wide text-gold">
                    {doc.kind.replace("_", " ")}
                  </span>
                  <span className="text-sm font-semibold text-ink">{doc.title}</span>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[2px] border border-hairline px-4 py-2 text-xs font-semibold text-navy-deep hover:border-navy-deep"
                  >
                    Download
                  </a>
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
