/** Absolute site origin for links inside emails. No trailing slash. */
export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw || raw.includes("your-domain.com")) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
