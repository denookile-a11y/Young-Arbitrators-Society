import Link from "next/link";
import { LeadershipPortrait, initials } from "@/components/leadership/leadership-portrait";
import type { HomepageLeader } from "@/lib/queries/homepage-leaders";

export { initials };

/**
 * Homepage committee: a condensed presentation of /leadership using the same
 * two groups and portrait proportions — Executives (large), then Department
 * Heads & Committee (square). Every current member is shown; nothing is
 * truncated by count. Bios are the existing profiles.bio, clamped.
 * States: error (query failed) / empty (renders nothing) / list.
 */
export function LeadershipSection({ leaders, failed = false }: { leaders: HomepageLeader[]; failed?: boolean }) {
  // An empty committee no longer makes the whole section vanish silently: the heading
  // stays and says so, with a way to the full leadership page.
  const executives = leaders.filter((l) => l.is_executive);
  const committee = leaders.filter((l) => !l.is_executive);

  return (
    <section aria-labelledby="leadership-heading" className="px-6 py-18 md:px-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[60ch]">
            <span className="mb-3 block text-[0.78rem] font-bold text-[#6f5013]">The People Behind YAS</span>
            <h2 id="leadership-heading" className="font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal leading-tight tracking-tight text-navy-deep">
              The minds behind the motion…
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
              A student committee devoted to arbitration, legal scholarship, advocacy and leadership at Kenyatta University School of Law.
            </p>
          </div>
          {!failed && (
            <Link href="/leadership" className="text-sm font-bold text-navy-deep underline decoration-gold underline-offset-4">
              Full leadership &amp; past editions
            </Link>
          )}
        </div>

        {failed ? (
          <p role="alert" className="rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Leadership profiles could not be loaded right now. Please refresh in a moment.
          </p>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-ink-soft">The current committee will be introduced here as soon as profiles are published.</p>
        ) : (
          <>
            {executives.length > 0 && (
              <ul className="mb-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {executives.map((l) => (
                  <li key={l.id}>
                    <Link href={`/leadership/${l.profile.slug}`} className="group flex flex-col gap-3.5">
                      <LeadershipPortrait name={l.profile.full_name} src={l.profile.portrait_url} className="aspect-[3/3.2]" />
                      <div className="font-serif text-[1.5rem] font-normal leading-snug text-navy-deep group-hover:underline">{l.profile.full_name}</div>
                      <div className="text-xs font-bold text-gold-on-light">{l.role_title}</div>
                      {l.profile.bio && <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{l.profile.bio}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {committee.length > 0 && (
              <>
                <span className="mb-4 block text-xs font-bold text-gold-on-light">Department Heads &amp; Committee</span>
                <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                  {committee.map((l) => (
                    <li key={l.id}>
                      <Link href={`/leadership/${l.profile.slug}`} className="group flex flex-col gap-2.5">
                        <LeadershipPortrait name={l.profile.full_name} src={l.profile.portrait_url} className="aspect-square" />
                        <div className="font-serif text-[1.1rem] font-normal leading-tight text-navy-deep group-hover:underline">{l.profile.full_name}</div>
                        <div className="text-xs font-bold text-gold-on-light">{l.role_title}</div>
                        {l.department && <div className="text-xs text-ink-soft">{l.department.name}</div>}
                        {l.profile.bio && <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{l.profile.bio}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
