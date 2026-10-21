import { z } from "zod";

const noLineBreaks = (v: string) => !/[\r\n]/.test(v);

/** Server-side validation + normalisation for the admin settings form. */
export const settingsSchema = z.object({
  site_title: z.string().trim().min(1, "Site title is required").max(120, "Site title is too long").refine(noLineBreaks, "Must be a single line"),
  contact_email: z.string().trim().toLowerCase().min(1, "Contact email is required").max(320, "Email is too long").email("Enter a valid email address").refine(noLineBreaks, "Must be a single line"),
  instagram_handle: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), "Letters, numbers, dots and underscores only (max 30)"),
  linkedin_url: z
    .string()
    .trim()
    .max(300, "URL is too long")
    .refine((v) => {
      if (v === "") return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && /(^|\.)linkedin\.com$/i.test(u.hostname);
      } catch {
        return false;
      }
    }, "Enter an https://linkedin.com/… URL"),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
