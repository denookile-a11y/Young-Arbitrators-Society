import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@yas.org", password: "hunter2" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing email", () => {
    const result = loginSchema.safeParse({ password: "hunter2" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "hunter2" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "hunter2" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "admin@yas.org" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@yas.org", password: "" });
    expect(result.success).toBe(false);
  });

  it("does not enforce a minimum password length", () => {
    // Documents CURRENT behavior: the schema only requires non-empty,
    // real password strength is enforced by Supabase Auth server-side at
    // account-creation time, not here. This is not a bug in this schema —
    // it's a login form, not a signup form — but the test makes the
    // boundary explicit rather than assumed.
    const result = loginSchema.safeParse({ email: "admin@yas.org", password: "a" });
    expect(result.success).toBe(true);
  });
});
