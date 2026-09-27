import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import type { Admin, AdminRole } from "@/types/database";

/**
 * Authorization guard for mutating Server Actions.
 *
 * Server Actions are publicly callable POST endpoints — they are NOT
 * protected by proxy.ts, which only gates page navigations. Without this
 * guard, the only thing standing between an unauthenticated caller and a
 * write is RLS. RLS is a genuine backstop and does reject those writes,
 * but relying on it alone means:
 *   - a single policy mistake becomes immediately exploitable
 *   - raw Postgres/RLS error text leaks back to the caller
 *   - every authenticated admin can invoke every action regardless of role
 *
 * This restores defence in depth: the action refuses early, with a clean
 * message, before touching the database.
 *
 * Throws on failure so the action's existing error handling surfaces it.
 */
export async function requireAdmin(minRole: AdminRole = "editor") {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Not authorised: you must be signed in as an administrator.");
  }

  if (!hasRole(admin, minRole)) {
    throw new Error("Not authorised: your account does not have permission for this action.");
  }

  return admin;
}

/**
 * Non-throwing variant for actions that return a form-state object rather
 * than throwing, so they can surface the failure inline in the UI.
 * Returns null when authorised, or an error string when not.
 */
export async function checkAdmin(minRole: AdminRole = "editor"): Promise<string | null> {
  const admin = await getCurrentAdmin();
  if (!admin) return "Not authorised: you must be signed in as an administrator.";
  if (!hasRole(admin, minRole)) {
    return "Not authorised: your account does not have permission for this action.";
  }
  return null;
}

/**
 * Returns whichever active admin is signed in, with no role floor at all —
 * used only by actions on department-scoped resources, which then apply
 * their own resource-specific ownership check (see lib/auth/department-
 * scope.ts) rather than a flat minimum role. Throws if no admin is signed
 * in, matching requireAdmin's contract.
 */
export async function requireAnyAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Not authorised: you must be signed in as an administrator.");
  }
  return admin;
}

/**
 * Non-throwing counterpart to requireAnyAdmin, for actions that return a
 * form-state object. Returns the admin so the caller can apply its own
 * department-scoped ownership check next.
 */
export async function checkAnyAdmin(): Promise<{ admin: Admin } | { error: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: "Not authorised: you must be signed in as an administrator." };
  return { admin };
}
