import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkAnyAdmin } from "@/lib/auth/require-admin";
import { hasRole } from "@/lib/auth/current-admin";
import { canWriteScopedRow, resolveWriteDepartmentId } from "@/lib/auth/department-scope";
import type { GenericFormState } from "./make-content-actions";
import type { AdminRole } from "@/types/database";

/**
 * Shared mutation core for content tables that RLS scopes by a
 * department_id column (currently publications and leadership_roles —
 * see supabase/migrations/002_people_structure.sql and 003_content.sql).
 * This is deliberately a *separate* file from make-content-actions.ts
 * rather than a flag on it: department-scoped and unscoped tables have
 * genuinely different rules (who's allowed in, and what department_id
 * ends up on the row), and folding both into one function's branches
 * would make the unscoped path — used by six other modules — harder to
 * read for no benefit to them.
 *
 * csr_projects is ALSO department_admin-writable, but has no department_id
 * column at all (see lib/auth/department-scope.ts's canManageCsr) — it
 * does not fit this shape and is handled separately in lib/actions/csr.ts.
 *
 * Not itself a Server Action file, for the same reason as
 * make-content-actions.ts: a factory returning closures can't be a "use
 * server" export. Each module's actions.ts wraps these in real named
 * async exports.
 */

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

export interface ScopedContentActionConfig<Schema extends z.ZodTypeAny> {
  table: string;
  schema: Schema;
  parseFormData: (formData: FormData) => unknown;
  listPath: string;
  publicPath: string;
  getSlug: (data: z.infer<Schema>) => string;
  /** The role floor for non-department_admin callers (editor for publications, admin for leadership_roles). */
  minRole: AdminRole;
}

type WithDepartmentId = { department_id?: string | null };

export async function runScopedCreate<Schema extends z.ZodTypeAny>(
  config: ScopedContentActionConfig<Schema>,
  formData: FormData
): Promise<GenericFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, config.minRole) && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const parsed = config.schema.safeParse(config.parseFormData(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const data = parsed.data as z.infer<Schema> & WithDepartmentId;
  const dept = resolveWriteDepartmentId(admin, data.department_id || null);
  if (!dept.ok) return { error: dept.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from(config.table)
    .insert({ ...data, department_id: dept.departmentId });
  if (error) {
    console.error(`runScopedCreate(${config.table}): insert failed`, error);
    return { error: "Something went wrong saving this. Please try again." };
  }

  revalidatePath(config.listPath);
  revalidatePath(config.publicPath);
  redirect(`${config.listPath}?toast=Created successfully`);
}

export async function runScopedUpdate<Schema extends z.ZodTypeAny>(
  config: ScopedContentActionConfig<Schema>,
  id: string,
  formData: FormData
): Promise<GenericFormState> {
  const authResult = await checkAnyAdmin();
  if ("error" in authResult) return { error: authResult.error };
  const { admin } = authResult;

  if (!hasRole(admin, config.minRole) && admin.role !== "department_admin") {
    return { error: "Not authorised: your account does not have permission for this action." };
  }

  const supabase = await createClient();

  // Ownership of the EXISTING row must be established server-side before
  // any write is attempted — never trust the URL-supplied `id` alone as
  // proof the caller owns it. RLS's own select policy lets any active
  // admin read this row regardless of department (see the "<table>
  // published are public" policies' `or is_admin()` clause), so this read
  // succeeding doesn't imply the write should be allowed — that's exactly
  // what canWriteScopedRow checks next.
  if (admin.role === "department_admin") {
    const { data: existing, error: fetchError } = await supabase
      .from(config.table)
      .select("department_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { error: "That item could not be found." };
    }
    if (!canWriteScopedRow(admin, (existing as { department_id: string | null }).department_id)) {
      return { error: "Not authorised: this item belongs to a different department." };
    }
  }

  const parsed = config.schema.safeParse(config.parseFormData(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const data = parsed.data as z.infer<Schema> & WithDepartmentId;
  const dept = resolveWriteDepartmentId(admin, data.department_id || null);
  if (!dept.ok) return { error: dept.error };

  const record = { ...data, department_id: dept.departmentId };

  const { error } = await supabase.from(config.table).update(record).eq("id", id);
  if (error) {
    console.error(`runScopedUpdate(${config.table}): update failed`, error);
    return { error: "Something went wrong saving this. Please try again." };
  }

  revalidatePath(config.listPath);
  revalidatePath(config.publicPath);
  revalidatePath(`${config.publicPath}/${config.getSlug(record as z.infer<Schema>)}`);
  redirect(`${config.listPath}?toast=Updated successfully`);
}
