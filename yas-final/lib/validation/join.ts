import { z } from "zod";

// SECURITY FIX (v10): add upper bounds, matching the same rationale as
// contactSchema (see lib/validation/contact.ts).
export const joinSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(200, "Full name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email is too long")
    .email("Enter a valid email address"),
  year_of_study: z.string().trim().max(50, "Year of study is too long").optional(),
});
export type JoinInput = z.infer<typeof joinSchema>;
