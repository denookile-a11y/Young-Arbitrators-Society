import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the auth session via Next.js cookies so
 * the logged-in admin's session is available on the server for RLS-scoped
 * queries and mutations.
 *
 * Deliberately NOT parameterized with the Database generic: our
 * hand-written types/database.ts (written without a live project to run
 * `supabase gen types` against) models Row shapes but not the exact
 * Insert/Update column-optionality the generated types provide, which
 * breaks the client's .insert()/.update() overload resolution. Reads stay
 * type-safe via explicit `.returns<T>()` calls at each call site; writes
 * are typed by the Zod-validated input at the call site instead. Once a
 * real project exists and `supabase gen types typescript` is run, restore
 * `createServerClient<Database>(...)` here for full inference.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // setAll called from a Server Component (no response object to
            // write cookies to) — safe to ignore as long as middleware.ts
            // is also refreshing the session, which it does below.
          }
        },
      },
    }
  );
}
