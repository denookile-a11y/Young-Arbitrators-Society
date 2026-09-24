import { hasRole } from "@/lib/auth/current-admin";
import type { Admin } from "@/types/database";

/**
 * Pure authorization decisions for department-scoped resources. These
 * mirror the RLS policies in supabase/migrations/002_people_structure.sql
 * and 003_content.sql exactly — see the comment on each function for which
 * policy it mirrors. Nothing here replaces RLS; it exists so the app layer
 * can (a) agree with the database layer and (b) fail with a clean message
 * instead of a silent zero-row no-op when it doesn't.
 *
 * department_admin's own department_id is the ONLY source of truth for
 * "which department can this admin write to" — never a client-supplied
 * value (hidden field, query param, or request body). Every function here
 * takes the admin's row (already loaded server-side via getCurrentAdmin())
 * and treats anything else as untrusted input to be checked, not trusted.
 */

export function isDepartmentAdmin(admin: Admin): boolean {
  return admin.role === "department_admin";
}

/**
 * Mirrors: "department_admin manages own leadership_roles" / "... own
 * publications" — `for all using (has_role('department_admin') and
 * department_id = current_admin_department())`.
 *
 * For tables that have their own department_id column (publications,
 * leadership_roles, department_members). editor+ is unscoped and always
 * passes; a department_admin passes only when the row's department_id
 * matches their own, and only when they have one at all (a department_admin
 * with no department assigned can write nothing here).
 */
export function canWriteScopedRow(admin: Admin, rowDepartmentId: string | null): boolean {
  if (hasRole(admin, "editor")) return true;
  if (isDepartmentAdmin(admin)) {
    return admin.department_id !== null && rowDepartmentId === admin.department_id;
  }
  return false;
}

/**
 * The department_id a write MUST use, given what the client submitted.
 * For a department_admin this is always their own department_id — the
 * submitted value is discarded entirely, not merely validated, so a
 * hidden-field or hand-crafted request can never smuggle a different id
 * through. For editor+ the submitted value is trusted as-is (it's already
 * an admin-only field with no department_admin concept attached).
 *
 * Returns `ok: false` for a department_admin with no department assigned —
 * there is nothing valid for them to write, so this fails closed rather
 * than falling back to null (which would mean "unscoped", a privilege
 * they don't have).
 */
export function resolveWriteDepartmentId(
  admin: Admin,
  submittedDepartmentId: string | null
): { ok: true; departmentId: string | null } | { ok: false; error: string } {
  if (isDepartmentAdmin(admin)) {
    if (!admin.department_id) {
      return { ok: false, error: "Your account is not assigned to a department." };
    }
    return { ok: true, departmentId: admin.department_id };
  }
  return { ok: true, departmentId: submittedDepartmentId };
}

/**
 * Mirrors: "department_admin manages own department" — `for update using
 * (has_role('department_admin') and id = current_admin_department())`.
 * Note this table has no insert/delete policy for department_admin at
 * all — only update — so this function is only ever used to gate updates
 * (create/delete for `departments` remain admin+ only, unchanged).
 */
export function canWriteOwnDepartment(admin: Admin, departmentId: string): boolean {
  if (hasRole(admin, "admin")) return true;
  return isDepartmentAdmin(admin) && admin.department_id === departmentId;
}

/**
 * Mirrors: "department_admin manages own csr_projects" — `for all using
 * (has_role('department_admin') and current_admin_department() = (select
 * id from departments where slug = 'csr'))`.
 *
 * csr_projects has NO department_id column at all — there is nothing on a
 * CSR project row to scope by. Instead, access is all-or-nothing: it's
 * granted only when the acting admin's OWN department is the one whose
 * slug is "csr". `csrDepartmentId` is that department's id (the id of
 * whichever department has slug 'csr'), resolved by the caller via a
 * lookup — this function only compares it against the admin's own
 * department_id, it does not perform the lookup itself.
 */
export function canManageCsr(admin: Admin, csrDepartmentId: string | null): boolean {
  if (hasRole(admin, "editor")) return true;
  return isDepartmentAdmin(admin) && csrDepartmentId !== null && admin.department_id === csrDepartmentId;
}
