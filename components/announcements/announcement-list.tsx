import Link from "next/link";
import type { Announcement } from "@/types/database";

export function announcementDate(a: Pick<Announcement, "publish_at" | "created_at">): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(a.publish_at ?? a.created_at));
}

function excerpt(body: string | null, max = 170): string {
  if (!body) return "";
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

/**
 * Published announcements as cards. Used by the homepage and department
 * pages. Three explicit states: error (query failed), empty, and list — an
 * outage is never presented as "nothing to announce".
 */
export function AnnouncementSection({
  announcements,
  failed = false,
  eyebrow = "Announcements",
  title = "Latest from YAS.",
  emptyMessage = "There are no announcements right now. Check back soon.",
  showAllLink = true,
}: {
  announcements: Announcement[];
  failed?: boolean;
  eyebrow?: string;
  title?: string;
  emptyMessage?: string;
  showAllLink?: boolean;
}) {
  return (
    <section aria-labelledby="announcements-heading" className="border-y border-hairline bg-off-white px-6 py-18 md:px-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 block text-[0.78rem] font-bold text-[#6f5013]">{eyebrow}</span>
            <h2 id="announcements-heading" className="font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal leading-tight tracking-tight text-navy-deep">
              {title}
            </h2>
          </div>
          {showAllLink && !failed && announcements.length > 0 && (
            <Link href="/announcements" className="text-sm font-bold text-navy-deep underline decoration-gold underline-offset-4">
              All announcements
            </Link>
          )}
        </div>

        {failed ? (
          <p role="alert" className="rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Announcements could not be loaded right now. Please refresh in a moment.
          </p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-ink-soft">{emptyMessage}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <li key={a.id} className="flex flex-col border border-hairline bg-white p-6 transition-colors hover:border-navy-deep">
                <div className="mb-3 flex items-center gap-3 text-[0.72rem] font-bold tracking-wide">
                  <span className="text-[#6f5013]">{(a.category ?? "News").toUpperCase()}</span>
                  <time dateTime={a.publish_at ?? a.created_at} className="font-medium text-ink-soft">
                    {announcementDate(a)}
                  </time>
                </div>
                <h3 className="font-serif text-[1.35rem] leading-snug text-navy-deep">
                  <Link href={`/announcements/${a.slug}`} className="underline-offset-4 hover:underline focus-visible:underline">
                    {a.title}
                  </Link>
                </h3>
                {a.body && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{excerpt(a.body)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
