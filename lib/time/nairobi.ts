/**
 * Administrator-facing time handling for announcements.
 *
 * The database columns (announcements.publish_at / expires_at) are
 * `timestamptz`, i.e. absolute instants. An admin types a wall-clock time in
 * Nairobi (<input type="datetime-local">, which has NO zone). Before this
 * module the raw "2026-10-12T09:30" string was sent to Postgres, which read it
 * in the session zone (UTC on Supabase) — so a 09:30 Nairobi entry became
 * 09:30 UTC = 12:30 Nairobi, three hours late.
 *
 * Conversion is done with Intl (the IANA zone database), not a hardcoded +3,
 * so it stays correct if the zone rules ever change. Only these two functions
 * move between "Nairobi wall clock" and "UTC instant"; everything downstream
 * (queries, cron, RLS) compares instants.
 */
export const ADMIN_TIME_ZONE = "Africa/Nairobi";

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Offset (ms) of `zone` from UTC at the given instant. */
function zoneOffsetMs(instantMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * "2026-10-12T09:30" (Nairobi wall clock) → "2026-10-12T06:30:00.000Z".
 * - Empty/undefined → undefined (field not set).
 * - A string that already carries a zone ("…Z" or "+03:00") is returned as the
 *   same instant, never converted again (guards against double conversion).
 * - Anything else (wrong shape, impossible date such as 2026-02-30) → the input
 *   is returned unchanged so schema validation rejects it with a clear error.
 */
export function nairobiLocalToUtcIso(value: string | undefined | null, zone = ADMIN_TIME_ZONE): string | undefined {
  if (value == null || value.trim() === "") return undefined;
  const v = value.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) {
    const t = Date.parse(v);
    return Number.isNaN(t) ? v : new Date(t).toISOString();
  }
  const m = LOCAL_RE.exec(v);
  if (!m) return v;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const h = Number(m[4]), mi = Number(m[5]), sec = m[6] ? Number(m[6]) : 0;
  const naive = Date.UTC(y, mo - 1, d, h, mi, sec);
  // Reject impossible calendar dates (Date.UTC would roll them over).
  const check = new Date(naive);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || check.getUTCHours() !== h) return v;
  // Two passes so the result is right even across an offset change.
  let utc = naive - zoneOffsetMs(naive, zone);
  utc = naive - zoneOffsetMs(utc, zone);
  return new Date(utc).toISOString();
}

/** Stored instant → value for <input type="datetime-local"> in Nairobi time. */
export function utcIsoToNairobiLocal(iso: string | null | undefined, zone = ADMIN_TIME_ZONE): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(t));
  const g = (type: string) => p.find((x) => x.type === type)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** "12 Oct 2026, 09:30" in Nairobi, for admin lists. */
export function formatNairobiDateTime(iso: string | null | undefined, zone = ADMIN_TIME_ZONE): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: zone, day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));
}
