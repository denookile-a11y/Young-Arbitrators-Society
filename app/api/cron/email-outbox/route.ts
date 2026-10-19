import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processOutbox } from "@/lib/email/outbox";
import { enqueueDueAnnouncementNotifications } from "@/lib/announcements/notify";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // fail closed if unset
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduled worker: (1) queue notifications for announcements that have gone
 * live (covers scheduled publish_at), (2) deliver / retry queued email.
 * Not callable by the public: requires `Authorization: Bearer $CRON_SECRET`
 * (the header Vercel Cron sends automatically when CRON_SECRET is set).
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const notifications = await enqueueDueAnnouncementNotifications();
    const delivery = await processOutbox(100);
    return NextResponse.json({ notifications, delivery });
  } catch (error) {
    console.error("email-outbox cron failed:", (error as Error).message);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
