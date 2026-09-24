import { notFound } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import { listGalleryItems } from "@/lib/queries/gallery";
import type { Gallery } from "@/types/database";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getContentBySlug<Gallery>("galleries", slug);
  if (!gallery) notFound();

  const items = await listGalleryItems(gallery.id);

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={gallery.category ?? "Gallery"}
        title={gallery.title}
        subtitle={gallery.description ?? undefined}
        trail={[{ label: "Gallery", href: "/gallery" }, { label: gallery.title }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          {items.length === 0 ? (
            <p className="text-sm text-ink-soft">No photos or videos in this gallery yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) =>
                item.kind === "video" ? (
                  <video key={item.id} src={item.file_url} controls className="aspect-square w-full bg-navy-deep object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.file_url}
                    alt={item.caption ?? gallery.title}
                    className="aspect-square w-full bg-off-white object-cover"
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
