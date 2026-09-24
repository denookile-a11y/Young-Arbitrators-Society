import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Protects /admin/* server-side. This is the real security boundary —
 * hiding admin nav links or checking auth only in a Client Component is
 * NOT sufficient (per the directive's explicit requirement) because a
 * request can always be made directly to a protected route. RLS in
 * Postgres is the final layer beneath this; this middleware exists to
 * redirect unauthenticated browser traffic before it renders anything.
 */
export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/login";

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and hitting /admin/login — send to the dashboard.
  if (path === "/admin/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on all admin routes, plus everything else EXCEPT static assets,
     * so the session cookie stays fresh site-wide without re-running on
     * every image/font request.
     */
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|mp4|webm)$).*)",
  ],
};
