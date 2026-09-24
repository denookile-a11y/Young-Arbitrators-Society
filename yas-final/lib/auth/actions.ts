"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { isSafeAdminRedirect } from "@/lib/auth/redirect-safety";

export interface LoginActionState {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}

/**
 * Real Supabase Auth sign-in — no mock, no hardcoded credentials. On
 * success, Supabase sets the session cookie (via the server client's
 * cookie handlers) and we redirect into the CMS. On failure, we return a
 * plain error rather than throwing, so the login form can render it inline.
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "password";
      if (key) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
  return { error: "Incorrect email or password." };
}
  // Only ever redirect to a same-app /admin path. redirectTo comes from a
  // query param an attacker fully controls (it's echoed back from the URL
  // in proxy.ts), so treating it as a free-form redirect target would be
  // an open-redirect vector. isSafeAdminRedirect is unit-tested directly —
  // see lib/auth/redirect-safety.test.ts.
  const redirectTo = formData.get("redirectTo");
  redirect(isSafeAdminRedirect(redirectTo) ? redirectTo : "/admin");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
