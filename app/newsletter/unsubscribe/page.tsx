import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { unsubscribeSubscriber } from "@/lib/newsletter/service";
import { getUnsubscribeSecret, verifyUnsubscribe } from "@/lib/newsletter/tokens";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribeAction(formData: FormData) {
  "use server";
  const id = String(formData.get("s") ?? "");
  const sig = String(formData.get("t") ?? "");
  const secret = getUnsubscribeSecret();
  if (!secret || !UUID.test(id) || !verifyUnsubscribe(id, sig, secret)) {
    redirect("/newsletter/unsubscribe?result=invalid");
  }
  const ok = await unsubscribeSubscriber(id);
  redirect(`/newsletter/unsubscribe?result=${ok ? "done" : "error"}`);
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; t?: string; result?: string }>;
}) {
  const { s, t, result } = await searchParams;
  const secret = getUnsubscribeSecret();
  const valid = Boolean(secret && s && t && UUID.test(s) && verifyUnsubscribe(s, t, secret));

  return (
    <>
      <SiteNav />
      <PageHero eyebrow="Newsletter" title="Unsubscribe." trail={[{ label: "Newsletter" }]} />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[560px] rounded-[2px] border border-navy-deep/20 bg-off-white px-6 py-8">
          {result === "done" ? (
            <>
              <p className="font-serif text-xl text-navy-deep">You have been unsubscribed.</p>
              <p className="mt-2 text-sm text-ink-soft">You will not receive further YAS announcement emails.</p>
            </>
          ) : result === "invalid" || (!result && !valid) ? (
            <p className="text-sm text-ink-soft">This unsubscribe link is not valid. Please use the link in the most recent email you received, or contact us through the <Link href="/contact" className="font-semibold text-navy-deep underline decoration-gold underline-offset-4">contact form</Link>.</p>
          ) : result === "error" ? (
            <p className="text-sm text-ink-soft">We could not process that just now. Please try the link again shortly.</p>
          ) : (
            <form action={unsubscribeAction}>
              <input type="hidden" name="s" value={s} />
              <input type="hidden" name="t" value={t} />
              <p className="font-serif text-xl text-navy-deep">Stop receiving YAS announcements?</p>
              <button type="submit" className="mt-6 rounded-[2px] bg-navy-deep px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-navy-mid">Unsubscribe</button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
