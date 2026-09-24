import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import type { Event } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getContentBySlug<Event>("events", slug);
  if (!event) return { title: "Events" };
  return {
    title: event.title,
    description: event.description ?? undefined,
    openGraph: {
      title: event.title,
      description: event.description ?? undefined,
      images: event.cover_image_url ? [event.cover_image_url] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getContentBySlug<Event>("events", slug);
  if (!event) notFound();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Registration Open"
        title={event.title}
        subtitle={`${new Date(event.starts_at).toLocaleString()}${event.venue ? " · " + event.venue : ""}`}
        trail={[{ label: "Events", href: "/events" }, { label: event.title }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[720px]">
          {event.description && (
            <p className="mb-8 text-[1.02rem] leading-relaxed text-ink-soft">{event.description}</p>
          )}
          {event.registration_url && (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-6 py-3.5 text-sm font-bold text-white hover:bg-navy-mid"
            >
              Register Now →
            </a>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
