import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { getContentBySlug } from "@/lib/queries/generic";
import { createClient } from "@/lib/supabase/server";
import type { Conference, ConferenceSpeaker } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const conference = await getContentBySlug<Conference>("conferences", slug);
  if (!conference) return { title: "Conferences" };
  return {
    title: conference.title,
    description: conference.description ?? undefined,
    openGraph: {
      title: conference.title,
      description: conference.description ?? undefined,
      images: conference.cover_image_url ? [conference.cover_image_url] : undefined,
    },
  };
}

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const conference = await getContentBySlug<Conference>("conferences", slug);
  if (!conference) notFound();

  const supabase = await createClient();
  const { data: speakers } = await supabase
    .from("conference_speakers")
    .select("*")
    .eq("conference_id", conference.id)
    .order("order_index", { ascending: true })
    .returns<ConferenceSpeaker[]>();

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow={`${new Date(conference.starts_at).toLocaleDateString()}${conference.venue ? " · " + conference.venue : ""}`}
        title={conference.title}
        subtitle={conference.description ?? undefined}
        trail={[{ label: "Conferences", href: "/conferences" }, { label: conference.title }]}
      />

      {conference.registration_url && (
        <section className="px-6 pt-14 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <a
              href={conference.registration_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-6 py-3.5 text-sm font-bold text-white hover:bg-navy-mid"
            >
              Register →
            </a>
          </div>
        </section>
      )}

      {conference.programme && conference.programme.length > 0 && (
        <section className="bg-off-white px-6 py-18 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-4 block text-xs font-bold text-gold">Programme</span>
            <h2 className="mb-12 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal">
              A full day of sessions.
            </h2>
            <div className="border-t border-hairline">
              {conference.programme.map((session, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr] gap-6 border-b border-hairline py-5">
                  <span className="text-xs font-extrabold tracking-wide text-gold">{session.time}</span>
                  <div>
                    <div className="text-sm font-semibold text-ink">{session.title}</div>
                    {session.location && <div className="text-xs text-ink-soft">{session.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {speakers && speakers.length > 0 && (
        <section className="px-6 py-18 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <span className="mb-4 block text-xs font-bold text-gold">Speakers</span>
            <h2 className="mb-12 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] font-normal">
              Practitioners and scholars.
            </h2>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="flex flex-col gap-2.5">
                  <div className="aspect-square bg-gradient-to-br from-navy-mid to-navy-deep" />
                  <div className="font-serif text-[1.05rem] font-normal leading-tight">
                    {speaker.display_name}
                  </div>
                  {speaker.role_title && <div className="text-xs font-bold text-gold">{speaker.role_title}</div>}
                  {speaker.organisation && <div className="text-xs text-ink-soft">{speaker.organisation}</div>}
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
