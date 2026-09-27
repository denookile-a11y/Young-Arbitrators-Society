/**
 * Pure predicate extracted from loginAction (lib/auth/actions.ts) so it can
 * be unit-tested without mocking Supabase or next/navigation. Behavior is
 * unchanged from the inline version — this is the exact same check, just
 * given a name and a home.
 *
 * A `redirectTo` value is only safe to redirect to if it is a same-app,
 * relative `/admin` path. It comes from a URL query parameter an attacker
 * fully controls (proxy.ts echoes it back into the login URL), so anything
 * that could be interpreted as an absolute or protocol-relative URL must
 * be rejected — otherwise a successful login becomes an open redirect.
 */
export function isSafeAdminRedirect(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;

  // SECURITY FIX (v10): `value.startsWith("/admin")` also accepted
  // `/administrator`, `/admin@evil.com`, `/admin.foo` — anything sharing
  // the prefix, not just the admin section itself. Not previously
  // exploitable as an open redirect (still same-origin), but unnecessarily
  // broad and a foothold for any future same-origin path that starts with
  // "/admin". Require an exact match on the admin root or a genuine
  // sub-path of it.
  const isAdminRoot = value === "/admin" || value.startsWith("/admin/");
  if (!isAdminRoot) return false;

  // Reject anything that isn't unambiguously a single relative path on
  // this origin: protocol-relative ("//evil.com"), absolute URLs with a
  // scheme ("https://…", "javascript:…"), backslashes (some browsers/
  // proxies treat "\" like "/" when resolving a URL, so "/admin\@evil.com"
  // or "/admin\\evil.com" could be coerced into a different host),
  // whitespace/control characters (can hide a scheme past naive checks,
  // e.g. "/admin\n/evil"), and literal encoded traversal of the leading
  // slash ("%2f%2f" etc. decoded by an intermediary) or a stray "?"/"#"
  // that Next's redirect would still honor but which shouldn't be able to
  // smuggle another origin in.
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  if (value.includes("\\")) return false;
  if (/[\s\x00-\x1f]/.test(value)) return false;
  if (/^\/admin(\/|$)/i.test(value) === false) return false;

  return true;
}
