"use server";

import { createClient } from "@/lib/supabase/server";
import { joinSchema } from "@/lib/validation/join";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export interface JoinFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Real insert into the `members` table — RLS policy "members insertable by
 * anyone (join form)" allows this specific insert-only path without
 * requiring auth, per supabase/migrations/002_people_structure.sql. New
 * signups land with status='review' by default (see the table default),
 * so an admin approves them via the CMS before they count as active members.
 */
export async function submitJoinFormAction(
  _prev: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  // SECURITY FIX (v10): rate-limit this unauthenticated public endpoint.
  const identifier = await getClientIdentifier();
  const limit = checkRateLimit(identifier, { name: "join", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return { error: "Too many submissions. Please try again in a minute." };
  }

  const parsed = joinSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    year_of_study: formData.get("year_of_study") || undefined,
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
  const { error } = await supabase.from("members").insert(parsed.data);

  if (error) {
    // A unique-constraint violation on email is the most likely real-world
    // failure here (members.email is unique) — surface it plainly instead
    // of a generic error. Anything else is logged server-side; the raw
    // Postgres error is never returned to an unauthenticated visitor.
    if (error.code === "23505") {
      return { error: "This email has already been used to join." };
    }
    console.error("submitJoinFormAction: insert failed", error);
    return { error: "Something went wrong submitting your application. Please try again." };
  }

  return { success: true };
}
