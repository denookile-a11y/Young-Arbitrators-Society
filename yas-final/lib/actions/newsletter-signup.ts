"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// SECURITY FIX (v10): add an upper bound, matching contactSchema/joinSchema.
const schema = z.object({ email: z.string().trim().max(320).email() });

export interface NewsletterFormState {
  success?: boolean;
  error?: string;
}

export async function subscribeNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  // SECURITY FIX (v10): rate-limit this unauthenticated public endpoint.
  const identifier = await getClientIdentifier();
  const limit = checkRateLimit(identifier, { name: "newsletter", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again in a minute." };
  }

  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email, source: "homepage_footer" });

  if (error) {
    // Unique-violation means this email already exists. That's either an
    // active subscriber (nothing to do) or someone who previously
    // unsubscribed and is now opting back in — so clear unsubscribed_at
    // rather than reporting success while leaving them suppressed.
    if (error.code === "23505") {
      const { error: reactivateError } = await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: null })
        .eq("email", parsed.data.email);
      if (reactivateError) {
        console.error("subscribeNewsletterAction: reactivate failed", reactivateError);
        return { error: "Something went wrong subscribing. Please try again." };
      }
      return { success: true };
    }
    console.error("subscribeNewsletterAction: insert failed", error);
    return { error: "Something went wrong subscribing. Please try again." };
  }

  return { success: true };
}
