import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import type { Research } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const research = await getContentBySlug<Research>("research", slug);
  if (!research) return { title: "Research" };
  return {
    title: research.title,
    description: research.abstract ?? undefined,
    openGraph: {
      title: research.title,
      description: research.abstract ?? undefined,
      images: research.cover_image_url ? [research.cover_image_url] : undefined,
    },
  };
}

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const research = await getContentBySlug<Research>("research", slug);
  if (!research) notFound();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={research.category ?? "Research Paper"}
        title={research.title}
        subtitle={
          research.authors.length > 0
            ? `By ${research.authors.join(", ")}${research.published_on ? " · " + new Date(research.published_on).toLocaleDateString() : ""}`
            : undefined
        }
        trail={[{ label: "Research", href: "/research" }, { label: research.title }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
          <div className="border-l-2 border-gold pl-7 font-serif text-[1.4rem] italic font-normal leading-snug text-navy-deep">
            Abstract
          </div>
          <div className="max-w-[560px] space-y-6">
            {research.abstract && (
              <p className="text-[1.02rem] leading-relaxed text-ink-soft">{research.abstract}</p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              {research.pdf_url && (
                <a
                  href={research.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-6 py-3.5 text-sm font-bold text-white hover:bg-navy-mid"
                >
                  Download PDF →
                </a>
              )}
              {research.tags.length > 0 && (
                <span className="text-sm text-ink-soft">
                  Tags: {research.tags.join(" · ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
