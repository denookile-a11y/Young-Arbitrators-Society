import { createServiceClient, isServiceClientConfigured } from "@/lib/supabase/service";
import { enqueueEmails, processOutbox, type NewOutboxEmail } from "@/lib/email/outbox";
import { renderAnnouncementEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";
import { getUnsubscribeSecret, signUnsubscribe } from "@/lib/newsletter/tokens";
import { isAnnouncementVisible } from "./visibility";

interface DueAnnouncement {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  status: string;
  publish_at: string | null;
  expires_at: string | null;
}

export interface NotifyResult {
  skipped?: string;
  announcements: number;
  queued: number;
  duplicates: number;
}

const PAGE = 500;

/**
 * Fan an opted-in, live announcement out to CONFIRMED, not-unsubscribed
 * subscribers via the outbox. Safe to call any number of times:
 *  - each (announcement, subscriber) pair has one dedupe_key, so repeated or
 *    concurrent runs insert nothing new;
 *  - notified_at is set only after every page was queued, so a partial
 *    failure is simply retried and the unique keys absorb the overlap.
 * Publication is never touched here: a failure leaves the announcement
 * published and un-notified, and is visible via notified_at IS NULL.
 */
export async function enqueueDueAnnouncementNotifications(now: Date = new Date()): Promise<NotifyResult> {
  const empty: NotifyResult = { announcements: 0, queued: 0, duplicates: 0 };
  const siteUrl = getSiteUrl();
  const secret = getUnsubscribeSecret();
  if (!isServiceClientConfigured()) return { ...empty, skipped: "Service role key is not configured." };
  if (!siteUrl) return { ...empty, skipped: "NEXT_PUBLIC_SITE_URL is not configured." };
  if (!secret) return { ...empty, skipped: "NEWSLETTER_TOKEN_SECRET is not configured (unsubscribe links cannot be signed)." };

  const db = createServiceClient();
  const { data, error } = await db
    .from("announcements")
    .select("id, slug, title, body, status, publish_at, expires_at")
    .eq("notify_subscribers", true)
    .is("notified_at", null)
    .eq("status", "published")
    .limit(20)
    .returns<DueAnnouncement[]>();
  if (error) throw new Error(`announcement notify: select failed: ${error.message}`);

  const due = (data ?? []).filter((a) => isAnnouncementVisible(a, now));
  const result: NotifyResult = { ...empty, announcements: due.length };

  for (const announcement of due) {
    let from = 0;
    let complete = true;
    for (;;) {
      const { data: subs, error: subError } = await db
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("status", "confirmed")
        .is("unsubscribed_at", null)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1)
        .returns<{ id: string; email: string }[]>();
      if (subError) throw new Error(`announcement notify: subscribers failed: ${subError.message}`);
      if (!subs || subs.length === 0) break;

      const emails: NewOutboxEmail[] = subs.map((sub) => {
        const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?s=${sub.id}&t=${signUnsubscribe(sub.id, secret)}`;
        const mail = renderAnnouncementEmail({
          title: announcement.title,
          excerpt: announcement.body,
          url: `${siteUrl}/announcements/${announcement.slug}`,
          unsubscribeUrl,
        });
        return {
          kind: "announcement",
          dedupeKey: `announcement:${announcement.id}:${sub.id}`,
          to: sub.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          headers: {
            "List-Unsubscribe": `<${siteUrl}/api/newsletter/unsubscribe?s=${sub.id}&t=${signUnsubscribe(sub.id, secret)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });
      const queued = await enqueueEmails(emails, db);
      if (!queued.ok) {
        console.error("announcement notify: enqueue failed", queued.error);
        complete = false;
        break;
      }
      result.queued += queued.inserted;
      result.duplicates += queued.duplicates;
      if (subs.length < PAGE) break;
      from += PAGE;
    }

    if (complete) {
      const { error: markError } = await db
        .from("announcements")
        .update({ notified_at: now.toISOString() })
        .eq("id", announcement.id)
        .is("notified_at", null);
      if (markError) console.error("announcement notify: could not mark notified", markError.message);
    }
  }
  return result;
}

/** Queue then make a first delivery attempt. Never throws into a publish flow. */
export async function notifyAndDeliver(): Promise<void> {
  try {
    const queued = await enqueueDueAnnouncementNotifications();
    if (queued.skipped) {
      console.warn("announcement notify skipped:", queued.skipped);
      return;
    }
    if (queued.queued > 0) await processOutbox(50);
  } catch (error) {
    console.error("announcement notify failed (publication unaffected):", (error as Error).message);
  }
}
