import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/auth/require-admin";

export interface GenericFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

export interface ContentActionConfig<Schema extends z.ZodTypeAny> {
  table: string;
  schema: Schema;
  parseFormData: (formData: FormData) => unknown;
  listPath: string;
  publicPath: string;
  getSlug: (data: z.infer<Schema>) => string;
}

/**
 * Shared mutation core — NOT itself a Server Action (this file has no
 * "use server" directive, since a factory returning closures can't satisfy
 * Next's requirement that every export of a "use server" file be a directly
 * analyzable async function declaration). Each module's actions.ts file
 * wraps these in its own "use server" file with real named async exports —
 * see lib/actions/research.ts for the pattern every module follows.
 */
export async function runCreate<Schema extends z.ZodTypeAny>(
  config: ContentActionConfig<Schema>,
  formData: FormData
): Promise<GenericFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = config.schema.safeParse(config.parseFormData(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from(config.table).insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath(config.listPath);
  revalidatePath(config.publicPath);
  redirect(`${config.listPath}?toast=Created successfully`);
}

export async function runUpdate<Schema extends z.ZodTypeAny>(
  config: ContentActionConfig<Schema>,
  id: string,
  formData: FormData
): Promise<GenericFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = config.schema.safeParse(config.parseFormData(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from(config.table).update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(config.listPath);
  revalidatePath(config.publicPath);
  revalidatePath(`${config.publicPath}/${config.getSlug(parsed.data)}`);
  redirect(`${config.listPath}?toast=Updated successfully`);
}
