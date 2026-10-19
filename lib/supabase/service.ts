import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. It BYPASSES RLS, so it is for server-only
 * bookkeeping that no visitor or admin session may perform directly: the
 * email outbox, and newsletter token/status transitions.
 *
 * Rules:
 *  - Import this only from Server Actions, Route Handlers and server-only
 *    library modules. NEVER from a "use client" file or anything a client
 *    component imports (a test guards this).
 *  - The key is read from SUPABASE_SERVICE_ROLE_KEY and never logged.
 *  - Callers must validate and authorize input themselves; RLS will not.
 */
export function isServiceClientConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Service client is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
