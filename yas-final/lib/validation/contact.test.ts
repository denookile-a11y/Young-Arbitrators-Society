import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact";

describe("contactSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello, I have a question about the moot.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = contactSchema.safeParse({
      email: "jane@example.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = contactSchema.safeParse({
      name: "",
      email: "jane@example.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane[at]example.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty message", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects entirely missing input", () => {
    const result = contactSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a very long message (v10: upper bound added)", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "a".repeat(50_000),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a message at exactly the max length boundary", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "a".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message one character over the max length", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized name", () => {
    const result = contactSchema.safeParse({
      name: "a".repeat(201),
      email: "jane@example.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized email", () => {
    const result = contactSchema.safeParse({
      name: "Jane Doe",
      email: `${"a".repeat(315)}@x.com`,
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace-only fields to empty and rejects them", () => {
    const result = contactSchema.safeParse({
      name: "   ",
      email: "jane@example.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });
});
