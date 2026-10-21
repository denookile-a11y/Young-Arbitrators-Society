"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation/contact";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { enqueueEmails, processOutbox } from "@/lib/email/outbox";
import { withinEmailBudget } from "@/lib/email/budget";
import { renderContactEmail } from "@/lib/email/templates";
import { resolveContactRecipient } from "@/lib/email/recipient";

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Contact form. Two separate guarantees, deliberately not conflated:
 *   1. RECEIVED — the message is stored in contact_messages. This is what
 *      "success" means to the visitor.
 *   2. FORWARDED — an email to the YAS inbox is queued in the outbox and
 *      delivered with retries. Its status lives in email_outbox and is never
 *      claimed to the visitor as "delivered".
 * If (1) fails the visitor gets an error. If only (2) fails the message is
 * safely stored, the failure is logged, and the retry job picks it up.
 */
export async function submitContactFormAction(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const identifier = await getClientIdentifier();
  const burst = checkRateLimit(identifier, { name: "contact", windowMs: 60_000, max: 5 });
  const hourly = checkRateLimit(identifier, { name: "contact-hourly", windowMs: 3_600_000, max: 20 });
  if (!burst.ok || !hourly.ok) {
    return { error: "Too many submissions. Please try again later." };
  }

  // Honeypot: real visitors never see or fill this. Pretend success so a bot
  // learns nothing, but store nothing and send nothing.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { success: true };
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

  // The id is generated here (not by the database) so the stored record and
  // its outbox entry share one identity. A repeated delivery of the same
  // submission therefore dedupes on `contact:<id>` instead of double-sending.
  const id = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({ id, ...parsed.data });
  if (error) {
    console.error("submitContactFormAction: insert failed", error.message);
    return { error: "Something went wrong sending your message. Please try again." };
  }

  try {
    const recipient = await resolveContactRecipient();
    if (!recipient) {
      console.error("submitContactFormAction: no valid recipient configured; message stored only");
      return { success: true };
    }
    if (!(await withinEmailBudget("contact"))) {
      console.error("submitContactFormAction: hourly email budget reached; message stored, email not queued");
      return { success: true };
    }
    const mail = renderContactEmail({ ...parsed.data, receivedAt: new Date().toISOString() });
    const queued = await enqueueEmails([
      {
        kind: "contact",
        dedupeKey: `contact:${id}`,
        to: recipient, // from configuration — never from the visitor
        replyTo: parsed.data.email, // validated single-line address
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      },
    ]);
    if (!queued.ok) {
      console.error("submitContactFormAction: could not queue email", queued.error);
      return { success: true };
    }
    // First delivery attempt happens after the response; failures stay queued
    // and are retried by the worker.
    after(async () => {
      try {
        await processOutbox(5);
      } catch (error) {
        console.error("contact: delivery attempt failed", (error as Error).message);
      }
    });
  } catch (err) {
    console.error("submitContactFormAction: email step failed (message is stored)", (err as Error).message);
  }

  return { success: true };
}
