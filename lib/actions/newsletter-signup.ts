"use server";

import { z } from "zod";
import { after } from "next/server";
import { processOutbox } from "@/lib/email/outbox";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { subscribeToNewsletter } from "@/lib/newsletter/service";

const schema = z.object({ email: z.string().trim().max(320).email() });

export interface NewsletterFormState {
  success?: boolean;
  error?: string;
}

/**
 * Double opt-in signup. Submitting an address only ever creates/refreshes a
 * PENDING subscriber and queues a confirmation email; it never confirms
 * anyone and never reveals whether the address was already subscribed.
 */
export async function subscribeNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  const identifier = await getClientIdentifier();
  const burst = checkRateLimit(identifier, { name: "newsletter", windowMs: 60_000, max: 5 });
  const hourly = checkRateLimit(identifier, { name: "newsletter-hourly", windowMs: 3_600_000, max: 15 });
  if (!burst.ok || !hourly.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  // Honeypot (hidden field in the form).
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") return { success: true };

  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const outcome = await subscribeToNewsletter(parsed.data.email, "homepage_footer");
  if (!outcome.ok) {
    return {
      error:
        outcome.reason === "not_configured" || outcome.reason === "busy"
          ? "Newsletter sign-up is temporarily unavailable. Please try again later."
          : "Something went wrong subscribing. Please try again.",
    };
  }
  // Deliver after the response so the visitor never waits on the provider;
  // anything that fails here stays queued for the retry worker.
  after(async () => {
    try {
      await processOutbox(5);
    } catch (error) {
      console.error("newsletter: delivery attempt failed", (error as Error).message);
    }
  });
  return { success: true };
}
