import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getDashboardStats, getRecentContent } from "@/lib/queries/dashboard";
import { NotConnectedBanner } from "@/components/admin/not-connected-banner";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  archived: "Archived",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-hairline text-ink-soft",
  review: "bg-gold/20 text-navy-deep",
  published: "bg-navy-deep text-white",
  archived: "bg-ink-soft/20 text-ink-soft",
};

export default async function AdminOverviewPage() {
  const configured = isSupabaseConfigured();

  // Only actually query when configured — an unconfigured client would
  // throw on every call, and we want ONE clear banner, not a stack trace.
  const stats = configured
    ? await getDashboardStats()
    : { memberCount: 0, upcomingEventCount: 0, publicationCount: 0, mootDocumentCount: 0, announcementCount: 0 };
  const recent = configured ? await getRecentContent() : [];

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold-on-light">
        Admin CMS
      </span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">
        Dashboard Overview
      </h1>

      {!configured && <NotConnectedBanner />}

      <div className="mb-12 grid grid-cols-2 border border-hairline sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Members", value: stats.memberCount },
          { label: "Upcoming Events", value: stats.upcomingEventCount },
          { label: "Publications", value: stats.publicationCount },
          { label: "Moot Documents", value: stats.mootDocumentCount },
          { label: "Announcements", value: stats.announcementCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border-b border-hairline px-4 py-6 last:border-b-0 sm:px-5 sm:py-7 lg:border-b-0 lg:border-r lg:px-6 lg:py-8 lg:last:border-r-0"
          >
            <span className="block font-serif text-2xl text-navy-deep sm:text-3xl">
              {configured ? stat.value : "—"}
            </span>
            <span className="mt-1 block text-xs font-semibold text-ink-soft sm:text-sm">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-xl text-navy-deep">Recent Content</h2>
      </div>

      {configured && recent.length === 0 && (
        <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
          <p className="font-serif text-lg text-navy-deep">No content yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Once you create publications, events, research, or moot entries,
            the most recently updated items will appear here.
          </p>
        </div>
      )}

      {configured && recent.length > 0 && (
        <div className="border-t border-hairline">
          {recent.map((item) => (
            <div
              key={`${item.category}-${item.id}`}
              className="flex flex-col gap-3 border-b border-hairline py-5 sm:grid sm:grid-cols-[110px_1fr] sm:items-center sm:gap-4 lg:grid-cols-[140px_1fr_auto] lg:gap-6"
            >
              <span
                className={`w-fit rounded-[2px] px-2.5 py-1 text-xs font-bold whitespace-nowrap ${STATUS_CLASS[item.status] ?? ""}`}
              >
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                <div className="text-xs text-ink-soft">
                  {item.category} · {item.meta}
                </div>
              </div>
              <Link
                href={item.editHref}
                className="w-fit rounded-[2px] border border-hairline px-4 py-2 text-xs font-semibold text-navy-deep hover:border-navy-deep"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}

      {!configured && (
        <div className="max-w-[520px] border border-dashed border-hairline px-8 py-16">
          <p className="font-serif text-lg text-navy-deep">Waiting for a database connection</p>
          <p className="mt-2 text-sm text-ink-soft">
            Recent content will list here once Supabase is connected and
            migrations have run.
          </p>
        </div>
      )}
    </div>
  );
}
