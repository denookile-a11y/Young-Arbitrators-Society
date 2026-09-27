import { describe, it, expect } from "vitest";
import { departmentMemberSchema } from "./content";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("departmentMemberSchema", () => {
  it("accepts a valid submission with a title", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      profile_id: UUID,
      department_id: UUID,
      title: "Associate",
      order_index: "2",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid submission with no title (optional)", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      profile_id: UUID,
      department_id: UUID,
      title: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing edition_id", () => {
    const result = departmentMemberSchema.safeParse({
      profile_id: UUID,
      department_id: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing profile_id", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      department_id: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing department_id (unlike leadership_roles, this is required)", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      profile_id: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid department_id", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      profile_id: UUID,
      department_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("defaults order_index to 0 when omitted", () => {
    const result = departmentMemberSchema.safeParse({
      edition_id: UUID,
      profile_id: UUID,
      department_id: UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.order_index).toBe(0);
  });
});
