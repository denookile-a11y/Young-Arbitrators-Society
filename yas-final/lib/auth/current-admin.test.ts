import { describe, it, expect } from "vitest";
import { hasRole } from "./current-admin";
import type { Admin, AdminRole } from "@/types/database";

/**
 * Tests the CURRENT implementation's documented behavior exactly — see the
 * comment above hasRole() in current-admin.ts. department_admin is a
 * scope-limited role, not the bottom of the super_admin > admin > editor
 * ladder: asking hasRole(admin, "department_admin") means "is this
 * specifically a department admin", and asking for any other role never
 * lets a department_admin through, even though editor/admin/super_admin
 * outrank it numerically in ROLE_RANK. This is intentional, not a bug —
 * do not "fix" these tests to make department_admin pass editor/admin
 * checks without a product decision (see PHASE_9B_REPORT.md, Part 1).
 */

function makeAdmin(role: AdminRole, overrides: Partial<Admin> = {}): Admin {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    full_name: "Test Admin",
    role,
    department_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("hasRole", () => {
  it("returns false when admin is null, regardless of minRole", () => {
    expect(hasRole(null, "editor")).toBe(false);
    expect(hasRole(null, "admin")).toBe(false);
    expect(hasRole(null, "super_admin")).toBe(false);
    expect(hasRole(null, "department_admin")).toBe(false);
  });

  describe("super_admin", () => {
    const admin = makeAdmin("super_admin");
    it("satisfies every rung of the ladder", () => {
      expect(hasRole(admin, "editor")).toBe(true);
      expect(hasRole(admin, "admin")).toBe(true);
      expect(hasRole(admin, "super_admin")).toBe(true);
    });
    it("does NOT satisfy the scope-limited department_admin check", () => {
      expect(hasRole(admin, "department_admin")).toBe(false);
    });
  });

  describe("admin", () => {
    const admin = makeAdmin("admin");
    it("satisfies editor and admin, not super_admin", () => {
      expect(hasRole(admin, "editor")).toBe(true);
      expect(hasRole(admin, "admin")).toBe(true);
      expect(hasRole(admin, "super_admin")).toBe(false);
    });
    it("does NOT satisfy department_admin", () => {
      expect(hasRole(admin, "department_admin")).toBe(false);
    });
  });

  describe("editor", () => {
    const admin = makeAdmin("editor");
    it("satisfies only editor", () => {
      expect(hasRole(admin, "editor")).toBe(true);
      expect(hasRole(admin, "admin")).toBe(false);
      expect(hasRole(admin, "super_admin")).toBe(false);
    });
    it("does NOT satisfy department_admin", () => {
      expect(hasRole(admin, "department_admin")).toBe(false);
    });
  });

  describe("department_admin", () => {
    const admin = makeAdmin("department_admin");
    it("does NOT satisfy editor, admin, or super_admin checks", () => {
      // This is the exact behavior documented in PHASE_9_REPORT.md Section
      // C: every mutating Server Action currently gates on editor+ or
      // admin+, so department_admin fails all of them today. This test
      // locks in that CURRENT behavior; it is not an endorsement of it.
      expect(hasRole(admin, "editor")).toBe(false);
      expect(hasRole(admin, "admin")).toBe(false);
      expect(hasRole(admin, "super_admin")).toBe(false);
    });
    it("DOES satisfy its own scope-limited check", () => {
      expect(hasRole(admin, "department_admin")).toBe(true);
    });
  });

  it("rejects an unknown/invalid role value defensively", () => {
    // AdminRole is a closed union, so this can only happen via a bad cast
    // or unexpected DB value — hasRole should not throw, and must not
    // silently grant access for a role it doesn't recognize.
    const admin = makeAdmin("editor", { role: "superuser" as AdminRole });
    expect(() => hasRole(admin, "editor")).not.toThrow();
    expect(hasRole(admin, "editor")).toBe(false);
    expect(hasRole(admin, "department_admin")).toBe(false);
  });
});
