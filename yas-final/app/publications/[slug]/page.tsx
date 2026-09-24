import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import type { Publication } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publication = await getContentBySlug<Publication>("publications", slug);
  if (!publication) return { title: "Publications" };
  return {
    title: publication.title,
    description: publication.excerpt ?? undefined,
    openGraph: {
      title: publication.title,
      description: publication.excerpt ?? undefined,
      images: publication.cover_image_url ? [publication.cover_image_url] : undefined,
    },
  };
}

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publication = await getContentBySlug<Publication>("publications", slug);
  if (!publication) notFound();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={publication.category ?? "News"}
        title={publication.title}
        subtitle={
          publication.published_on
            ? new Date(publication.published_on).toLocaleDateString()
            : undefined
        }
        trail={[{ label: "Publications", href: "/publications" }, { label: publication.title }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[720px]">
          {publication.excerpt && (
            <p className="mb-6 font-serif text-lg italic leading-relaxed text-navy-deep">
              {publication.excerpt}
            </p>
          )}
          {publication.body && (
            <div className="whitespace-pre-line text-[1.02rem] leading-relaxed text-ink-soft">
              {publication.body}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
