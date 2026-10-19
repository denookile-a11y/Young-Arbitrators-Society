import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { confirmSubscription } from "@/lib/newsletter/service";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false } };

async function confirmAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const result = await confirmSubscription(token);
  redirect(`/newsletter/confirm?result=${result}`);
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: { title: "Subscription confirmed.", body: "Thank you — you will now receive YAS announcements. Every email includes an unsubscribe link." },
  expired: { title: "This link has expired.", body: "Confirmation links are valid for 48 hours. Please subscribe again from the homepage to get a new one." },
  invalid: { title: "This link is no longer valid.", body: "It may already have been used. If you are not yet subscribed, subscribe again from the homepage." },
  error: { title: "Something went wrong.", body: "We could not confirm your subscription. Please try the link again in a moment." },
};

/**
 * Confirmation is a button press (POST), not a bare GET: mail scanners and
 * link previewers fetch URLs automatically and would otherwise consume the
 * single-use token before the person ever sees it.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string }>;
}) {
  const { token, result } = await searchParams;
  const done = result ? MESSAGES[result] : undefined;

  return (
    <>
      <SiteNav />
      <PageHero eyebrow="Newsletter" title="Confirm your subscription." trail={[{ label: "Newsletter" }]} />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[560px] rounded-[2px] border border-navy-deep/20 bg-off-white px-6 py-8">
          {done ? (
            <>
              <p className="font-serif text-xl text-navy-deep">{done.title}</p>
              <p className="mt-2 text-sm text-ink-soft">{done.body}</p>
              <Link href="/" className="mt-6 inline-block text-sm font-bold text-navy-deep underline decoration-gold underline-offset-4">Back to the homepage</Link>
            </>
          ) : token ? (
            <form action={confirmAction}>
              <input type="hidden" name="token" value={token} />
              <p className="font-serif text-xl text-navy-deep">One last step.</p>
              <p className="mt-2 text-sm text-ink-soft">Confirm that you want to receive Young Arbitrators Society announcements by email.</p>
              <button type="submit" className="mt-6 rounded-[2px] bg-navy-deep px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-navy-mid">Confirm subscription</button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft">This confirmation link is incomplete. Please use the link in your email.</p>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
