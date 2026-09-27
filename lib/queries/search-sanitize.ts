/**
 * Pure helper extracted from searchPublicContent (lib/queries/search.ts) so
 * it can be unit-tested without a Supabase client. Behavior is unchanged
 * from the inline version.
 *
 * Escapes PostgREST's reserved characters (`,`, `(`, `)`, `\`) out of a raw
 * search term so it can't break out of a `.or()` filter expression, then
 * wraps it as an `ilike` substring pattern. Returns null for an empty/
 * whitespace-only input (including one that becomes empty after
 * sanitizing), since there is nothing meaningful to search for.
 */
// SECURITY FIX (v10): cap query length. Nothing previously bounded how
// long `q` could be — an attacker could submit a very large string that
// gets embedded (post-sanitization) into seven `ilike` patterns across
// seven parallel queries, needlessly inflating request/response size and
// scan cost for a search term no legitimate user would type. 200 chars is
// far beyond any real search phrase.
const MAX_QUERY_LENGTH = 200;

export function toSearchPattern(rawQuery: string): string | null {
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return null;

  const safe = q.replace(/[,()\\]/g, " ").trim();
  if (!safe) return null;

  return `%${safe}%`;
}
