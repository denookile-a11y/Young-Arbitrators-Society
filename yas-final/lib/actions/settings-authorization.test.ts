import { describe, it, expect } from "vitest";
import { hasRole } from "@/lib/auth/current-admin";
import type { Admin, AdminRole } from "@/types/database";

/**
 * v10 fix: updateSiteSettingsAction now calls checkAdmin("super_admin")
 * before touching the database (previously it had no application-level
 * gate at all — see PHASE_10_REPORT.md, finding 2). checkAdmin/requireAdmin
 * are both thin wrappers around hasRole(admin, minRole), so — following
 * the same pattern as global-admin-protection.test.ts for the sibling
 * admin-management actions — this tests that exact gate by name for every
 * role that must be refused, plus the one role that must pass.
 *
 * This module has no Supabase mocking infrastructure (see
 * vitest.config.mts), so this deliberately tests the pure authorization
 * predicate the action relies on rather than exercising the Server Action
 * end-to-end against a real or mocked database.
 */
describe("updateSiteSettingsAction's authorization gate (super_admin only)", () => {
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

  it.each(nonSuperAdminRoles)(
    "%s cannot pass the requireAdmin/checkAdmin(\"super_admin\") gate used to update site settings",
    (role) => {
      expect(hasRole(makeAdmin(role), "super_admin")).toBe(false);
    }
  );

  it('super_admin can pass the gate used to update site settings', () => {
    expect(hasRole(makeAdmin("super_admin"), "super_admin")).toBe(true);
  });
});
