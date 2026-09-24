import { describe, it, expect } from "vitest";
import {
  isDepartmentAdmin,
  canWriteScopedRow,
  resolveWriteDepartmentId,
  canWriteOwnDepartment,
  canManageCsr,
} from "./department-scope";
import type { Admin, AdminRole } from "@/types/database";

const CSR_DEPT = "11111111-1111-1111-1111-111111111111";
const OTHER_DEPT = "22222222-2222-2222-2222-222222222222";

function makeAdmin(role: AdminRole, departmentId: string | null = null): Admin {
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

describe("isDepartmentAdmin", () => {
  it("is true only for the department_admin role", () => {
    expect(isDepartmentAdmin(makeAdmin("department_admin"))).toBe(true);
    expect(isDepartmentAdmin(makeAdmin("editor"))).toBe(false);
    expect(isDepartmentAdmin(makeAdmin("admin"))).toBe(false);
    expect(isDepartmentAdmin(makeAdmin("super_admin"))).toBe(false);
  });
});

describe("canWriteScopedRow — publications/leadership_roles pattern", () => {
  it("editor+ can write any row, including one with no department", () => {
    expect(canWriteScopedRow(makeAdmin("editor"), CSR_DEPT)).toBe(true);
    expect(canWriteScopedRow(makeAdmin("admin"), null)).toBe(true);
    expect(canWriteScopedRow(makeAdmin("super_admin"), OTHER_DEPT)).toBe(true);
  });

  it("department_admin can write a row in their own department", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canWriteScopedRow(admin, CSR_DEPT)).toBe(true);
  });

  it("department_admin CANNOT write a row in a different department (cross-department block)", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canWriteScopedRow(admin, OTHER_DEPT)).toBe(false);
  });

  it("department_admin CANNOT write an unassigned (null-department) row", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canWriteScopedRow(admin, null)).toBe(false);
  });

  it("a department_admin with no department assigned can write nothing", () => {
    const admin = makeAdmin("department_admin", null);
    expect(canWriteScopedRow(admin, null)).toBe(false);
    expect(canWriteScopedRow(admin, CSR_DEPT)).toBe(false);
  });
});

describe("resolveWriteDepartmentId — the client-supplied-value trust boundary", () => {
  it("editor+ keeps whatever was submitted, including null/none", () => {
    const admin = makeAdmin("editor");
    expect(resolveWriteDepartmentId(admin, OTHER_DEPT)).toEqual({ ok: true, departmentId: OTHER_DEPT });
    expect(resolveWriteDepartmentId(admin, null)).toEqual({ ok: true, departmentId: null });
  });

  it("department_admin ALWAYS gets their own department, ignoring what was submitted", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    // The critical case: even if a request claims a different department,
    // the resolved value is still the admin's own — the submitted value
    // is discarded, not merely validated against it.
    expect(resolveWriteDepartmentId(admin, OTHER_DEPT)).toEqual({ ok: true, departmentId: CSR_DEPT });
    expect(resolveWriteDepartmentId(admin, null)).toEqual({ ok: true, departmentId: CSR_DEPT });
    expect(resolveWriteDepartmentId(admin, "")).toEqual({ ok: true, departmentId: CSR_DEPT });
  });

  it("fails closed for a department_admin with no department assigned", () => {
    const admin = makeAdmin("department_admin", null);
    const result = resolveWriteDepartmentId(admin, OTHER_DEPT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not assigned to a department/i);
  });
});

describe("canWriteOwnDepartment — departments table (update-only)", () => {
  it("admin+ can write any department", () => {
    expect(canWriteOwnDepartment(makeAdmin("admin"), OTHER_DEPT)).toBe(true);
    expect(canWriteOwnDepartment(makeAdmin("super_admin"), OTHER_DEPT)).toBe(true);
  });

  it("editor cannot write departments at all (RLS requires admin+ or department_admin)", () => {
    expect(canWriteOwnDepartment(makeAdmin("editor"), OTHER_DEPT)).toBe(false);
  });

  it("department_admin can write only their own department id", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canWriteOwnDepartment(admin, CSR_DEPT)).toBe(true);
    expect(canWriteOwnDepartment(admin, OTHER_DEPT)).toBe(false);
  });
});

describe("canManageCsr — no department_id column, slug-based scoping", () => {
  it("editor+ can always manage CSR projects", () => {
    expect(canManageCsr(makeAdmin("editor"), CSR_DEPT)).toBe(true);
    expect(canManageCsr(makeAdmin("admin"), null)).toBe(true);
  });

  it("a department_admin whose own department IS the csr department can manage CSR projects", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canManageCsr(admin, CSR_DEPT)).toBe(true);
  });

  it("a department_admin from any OTHER department cannot manage CSR projects", () => {
    const admin = makeAdmin("department_admin", OTHER_DEPT);
    expect(canManageCsr(admin, CSR_DEPT)).toBe(false);
  });

  it("fails closed if the csr department could not be resolved", () => {
    const admin = makeAdmin("department_admin", CSR_DEPT);
    expect(canManageCsr(admin, null)).toBe(false);
  });
});
