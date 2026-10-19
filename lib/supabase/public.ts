import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for PUBLIC reads that are cached across requests
 * (it cannot be used inside `unstable_cache` through the cookie-based
 * server client, which reads request cookies). RLS still applies — this is
 * the same anon role a visitor has, so it can only see what is public.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
