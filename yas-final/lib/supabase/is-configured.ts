/**
 * True only when real Supabase credentials are present. Used to show an
 * honest "not connected yet" state in the CMS instead of letting queries
 * fail silently or, worse, papering over the failure with fabricated
 * numbers. Per the directive: unimplemented/unconnected features must be
 * clearly marked pending, never faked.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project-ref"));
}
