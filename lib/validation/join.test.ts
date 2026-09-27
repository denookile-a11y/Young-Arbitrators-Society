import { describe, it, expect } from "vitest";
import { joinSchema } from "./join";

describe("joinSchema", () => {
  it("accepts a valid submission with year_of_study", () => {
    const result = joinSchema.safeParse({
      full_name: "Jane Doe",
      email: "jane@example.com",
      year_of_study: "3rd Year",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid submission without year_of_study (optional field)", () => {
    const result = joinSchema.safeParse({
      full_name: "Jane Doe",
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing full_name", () => {
    const result = joinSchema.safeParse({ email: "jane@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty full_name", () => {
    const result = joinSchema.safeParse({ full_name: "", email: "jane@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = joinSchema.safeParse({ full_name: "Jane Doe" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = joinSchema.safeParse({
      full_name: "Jane Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized full_name (v10: upper bound added)", () => {
    const result = joinSchema.safeParse({
      full_name: "a".repeat(201),
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a full_name at exactly the max length boundary", () => {
    const result = joinSchema.safeParse({
      full_name: "a".repeat(200),
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an oversized year_of_study", () => {
    const result = joinSchema.safeParse({
      full_name: "Jane Doe",
      email: "jane@example.com",
      year_of_study: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});
