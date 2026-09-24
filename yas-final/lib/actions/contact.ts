"use server";

import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation/contact";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitContactFormAction(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // SECURITY FIX (v10): rate-limit this unauthenticated public endpoint.
  // See lib/rate-limit.ts for the identifier/window/limit rationale.
  const identifier = await getClientIdentifier();
  const limit = checkRateLimit(identifier, { name: "contact", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return { error: "Too many submissions. Please try again in a minute." };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(parsed.data);
  // Never surface the raw Postgres error to an unauthenticated visitor —
  // it can leak schema/constraint details. Log server-side for debugging.
  if (error) {
    console.error("submitContactFormAction: insert failed", error);
    return { error: "Something went wrong sending your message. Please try again." };
  }

  return { success: true };
}
