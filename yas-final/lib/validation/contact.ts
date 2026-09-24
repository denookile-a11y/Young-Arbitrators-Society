import { z } from "zod";

// SECURITY FIX (v10): no upper bounds previously existed on any of these
// fields (see contact.test.ts, which documented the message gap
// explicitly). Unauthenticated visitors could submit arbitrarily large
// payloads — a cheap way to bloat the database or degrade the admin UI
// rendering contact_messages. Limits below are generous for legitimate use
// (a name or subject-line-sized field is never realistically this long;
// a message is capped well above what a genuine inquiry needs) while
// bounding worst-case size.
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email is too long") // RFC 5321 max mailbox length
    .email("Enter a valid email address"),
  message: z.string().trim().min(1, "Message is required").max(5000, "Message is too long"),
});
export type ContactInput = z.infer<typeof contactSchema>;
