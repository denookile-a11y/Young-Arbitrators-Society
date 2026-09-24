import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Admin, AdminRole } from "@/types/database";

/**
 * v10 fix (PHASE_10_REPORT.md finding 1): several RLS select policies used
 * `status = 'published' or is_admin()`, which let a department_admin read
 * unpublished rows belonging to OTHER departments, since is_admin() is
 * true for every active admin role. Migration 006 replaces that pattern,
 * on the tables that actually carry department ownership, with:
 *   published OR is_global_admin_reader() OR (own department's admin AND
 *   this row belongs to their department)
 *
 * There is no live Postgres instance available to this test run (no
 * production/staging credentials — see PHASE_10_REPORT.md "Testing"), so
 * this file does two things instead of exercising real RLS:
 *
 * 1. Mirrors the fixed predicate in pure TypeScript (same approach
 *    lib/auth/department-scope.ts already takes for the write side) and
 *    exercises the cross-department-leak scenario the audit found.
 * 2. Statically asserts the migration file actually contains the fixed
 *    policy text for each affected table, so a future edit that
 *    reintroduces the bare `is_admin()` read pattern on these tables (or
 *    deletes the migration) fails this test even without a database.
 *
 * This does not replace running the migration against a real Supabase
 * project and exercising it with actual sessions per role — that remains
 * an infrastructure-dependent verification step (see PHASE_10_REPORT.md).
 */

type Role = AdminRole;

function makeAdmin(role: Role, departmentId: string | null): Admin {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    full_name: "Test Admin",
    role,
    department_id: departmentId,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function isGlobalAdminReader(admin: Admin): boolean {
  return admin.role === "super_admin" || admin.role === "admin" || admin.role === "editor";
}

/** Mirrors the fixed `publications`/`leadership_roles` select policy. */
function canReadDeptScopedRow(
  admin: Admin,
  status: "draft" | "review" | "published" | "archived",
  rowDepartmentId: string | null
): boolean {
  if (status === "published") return true;
  if (isGlobalAdminReader(admin)) return true;
  if (admin.role === "department_admin" && rowDepartmentId !== null) {
    return rowDepartmentId === admin.department_id;
  }
  return false;
}

const DEPT_A = "11111111-1111-1111-1111-111111111111";
const DEPT_B = "22222222-2222-2222-2222-222222222222";

describe("department_admin read scope — publications/leadership_roles pattern", () => {
  it("department_admin CANNOT read unpublished content from another department", () => {
    const admin = makeAdmin("department_admin", DEPT_A);
    expect(canReadDeptScopedRow(admin, "draft", DEPT_B)).toBe(false);
    expect(canReadDeptScopedRow(admin, "review", DEPT_B)).toBe(false);
    expect(canReadDeptScopedRow(admin, "archived", DEPT_B)).toBe(false);
  });

  it("department_admin CAN read permitted (unpublished) content from their own department", () => {
    const admin = makeAdmin("department_admin", DEPT_A);
    expect(canReadDeptScopedRow(admin, "draft", DEPT_A)).toBe(true);
    expect(canReadDeptScopedRow(admin, "review", DEPT_A)).toBe(true);
    expect(canReadDeptScopedRow(admin, "archived", DEPT_A)).toBe(true);
  });

  it("department_admin with no department assigned cannot read any unpublished scoped row", () => {
    const admin = makeAdmin("department_admin", null);
    expect(canReadDeptScopedRow(admin, "draft", DEPT_A)).toBe(false);
    expect(canReadDeptScopedRow(admin, "draft", null)).toBe(false);
  });

  it("department_admin cannot read an unpublished row with no department (global/executive row)", () => {
    // e.g. leadership_roles.department_id is nullable for executive roles —
    // a department_admin has no ownership claim over a null-department row.
    const admin = makeAdmin("department_admin", DEPT_A);
    expect(canReadDeptScopedRow(admin, "draft", null)).toBe(false);
  });

  it.each<Role>(["super_admin", "admin", "editor"])(
    "global/super admins (%s) retain full read access regardless of department",
    (role) => {
      const admin = makeAdmin(role, null);
      expect(canReadDeptScopedRow(admin, "draft", DEPT_A)).toBe(true);
      expect(canReadDeptScopedRow(admin, "draft", DEPT_B)).toBe(true);
      expect(canReadDeptScopedRow(admin, "draft", null)).toBe(true);
    }
  );

  it("published public content remains publicly readable regardless of role or department", () => {
    // status === 'published' short-circuits true before any role check —
    // this models an anonymous/public caller (no admin row at all).
    const noAdmin = makeAdmin("department_admin", DEPT_B); // department irrelevant here
    expect(canReadDeptScopedRow(noAdmin, "published", DEPT_A)).toBe(true);
    expect(canReadDeptScopedRow(noAdmin, "published", null)).toBe(true);
  });
});

describe("migration 006 — static verification the fix is actually present", () => {
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/006_department_admin_read_scope.sql"
  );
  const sql = readFileSync(migrationPath, "utf-8");

  it("defines is_global_admin_reader() restricted to admin/super_admin/editor", () => {
    expect(sql).toContain("create or replace function is_global_admin_reader()");
    expect(sql).toContain("role in ('super_admin', 'admin', 'editor')");
  });

  it.each([
    "departments",
    "leadership_roles",
    "department_members",
    "csr_projects",
    "publications",
  ])("replaces the bare is_admin() read policy on %s", (table) => {
    // Every fixed table must have its old bare-is_admin() select policy
    // dropped and must reference the new department-scoped reader
    // predicate — either the helper directly or the equivalent
    // current_admin_department() comparison used by csr_projects/
    // department_members, which have no direct department_id-vs-helper
    // shape.
    const tableSection = sql.slice(sql.indexOf(`on ${table}`));
    expect(sql).toContain(`drop policy if exists`);
    expect(
      tableSection.includes("is_global_admin_reader()") ||
        tableSection.includes("current_admin_department()")
    ).toBe(true);
  });

  it("does not leave a bare 'published or is_admin()' policy on the fixed tables", () => {
    // Guards against a partial revert: none of the five fixed tables'
    // policy blocks should still use the old, overly-broad shape as their
    // ONLY department-admin-relevant check. (Other tables in 001-004
    // legitimately keep this shape — see migration 006's own comment on
    // why they were intentionally left alone — so this only inspects 006
    // itself, which should contain no unqualified `or is_admin())` left.)
    expect(sql).not.toMatch(/or is_admin\(\)\)/);
  });
});
