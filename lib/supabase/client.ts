import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client, for use in Client Components ("use client").
 * Reads the public URL and anon key from environment variables — never a
 * service-role key here, since this code ships to the browser.
 *
 * Not parameterized with the Database generic — see the comment in
 * server.ts for why (hand-written types don't model Insert/Update shapes
 * precisely enough for the client's overloads). Restore
 * `createBrowserClient<Database>(...)` once real generated types exist.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
