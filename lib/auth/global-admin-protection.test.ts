import { describe, it, expect } from "vitest";
import { hasRole } from "./current-admin";
import type { Admin, AdminRole } from "@/types/database";

/**
 * lib/actions/settings.ts's updateAdminRoleAction and deactivateAdminAction
 * both gate on `requireAdmin("super_admin")`, which is exactly
 * `hasRole(admin, "super_admin")` under the hood. This file tests that
 * gate directly and by name, for every role that must never pass it,
 * because "department_admin cannot reach global administration" is a
 * distinct, explicitly-required property from the general role-ladder
 * tests in current-admin.test.ts — a regression here is a privilege
 * escalation, not just an off-by-one in a ranking table.
 */
describe("global administration is super_admin-only, for every non-super_admin role", () => {
  const nonSuperAdminRoles: AdminRole[] = ["department_admin", "editor", "admin"];

  function makeAdmin(role: AdminRole): Admin {
    return {
      id: "00000000-0000-0000-0000-000000000000",
      full_name: "Test Admin",
      role,
      department_id: null,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
  }

  it.each(nonSuperAdminRoles)("%s cannot pass the requireAdmin(\"super_admin\") gate used to change admin roles", (role) => {
    expect(hasRole(makeAdmin(role), "super_admin")).toBe(false);
  });

  it.each(nonSuperAdminRoles)("%s cannot pass the same gate used to deactivate an admin", (role) => {
    // Same gate, same function — deactivateAdminAction uses the identical
    // requireAdmin("super_admin") call. Testing it separately documents
    // the requirement by name rather than relying on the reader to know
    // both actions share one check.
    expect(hasRole(makeAdmin(role), "super_admin")).toBe(false);
  });

  it("department_admin specifically cannot escalate via its scope-limited exact-match check either", () => {
    // department_admin's hasRole(admin, "department_admin") === true does
    // NOT imply hasRole(admin, "admin"/"super_admin") — confirming these
    // are independent checks, not a ladder department_admin could climb.
    const deptAdmin = makeAdmin("department_admin");
    expect(hasRole(deptAdmin, "department_admin")).toBe(true);
    expect(hasRole(deptAdmin, "admin")).toBe(false);
    expect(hasRole(deptAdmin, "super_admin")).toBe(false);
  });

  it("only super_admin passes the gate", () => {
    const admin: Admin = {
      id: "00000000-0000-0000-0000-000000000000",
      full_name: "Test Admin",
      role: "super_admin",
      department_id: null,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(hasRole(admin, "super_admin")).toBe(true);
  });
});
