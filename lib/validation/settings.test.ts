import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings";
import { announcementSchema } from "./content";
import { contactSchema } from "./contact";

const valid = { site_title: "Young Arbitrators Society", contact_email: "Info@YAS-KU.org ", instagram_handle: "@yas_kusol", linkedin_url: "https://www.linkedin.com/company/yas" };

describe("settingsSchema", () => {
  it("normalises: trims, lowercases email, strips @ from the handle", () => {
    const r = settingsSchema.parse(valid);
    expect(r.contact_email).toBe("info@yas-ku.org");
    expect(r.instagram_handle).toBe("yas_kusol");
  });
  it("allows clearing the optional fields", () => {
    expect(settingsSchema.safeParse({ ...valid, instagram_handle: "", linkedin_url: "" }).success).toBe(true);
  });
  it.each([
    [{ contact_email: "" }, "contact_email"],
    [{ contact_email: "not-an-email" }, "contact_email"],
    [{ contact_email: "a@b.test\r\nBcc: x@y.test" }, "contact_email"],
    [{ site_title: "" }, "site_title"],
    [{ site_title: "Line\nBreak" }, "site_title"],
    [{ linkedin_url: "http://linkedin.com/company/yas" }, "linkedin_url"],
    [{ linkedin_url: "https://evil.example/linkedin.com" }, "linkedin_url"],
    [{ linkedin_url: "javascript:alert(1)" }, "linkedin_url"],
    [{ instagram_handle: "bad handle!" }, "instagram_handle"],
  ])("rejects %j", (patch, field) => {
    const r = settingsSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === field)).toBe(true);
  });
});

describe("announcementSchema (department + notify)", () => {
  const base = { slug: "new-moot", title: "T", status: "published" };
  it("empty department means global (null) and notify is never switched on implicitly", () => {
    const r = announcementSchema.parse({ ...base, department_id: "" });
    expect(r.department_id).toBeNull();
    expect(r.notify_subscribers ?? false).toBe(false);
  });
  it("accepts a department uuid and rejects junk", () => {
    expect(announcementSchema.parse({ ...base, department_id: "123e4567-e89b-42d3-a456-426614174000" }).department_id).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(announcementSchema.safeParse({ ...base, department_id: "nope" }).success).toBe(false);
  });
});

describe("contactSchema header-injection guard", () => {
  it("rejects a name containing a line break", () => {
    expect(contactSchema.safeParse({ name: "Eve\r\nBcc: a@b.test", email: "e@x.test", message: "hi" }).success).toBe(false);
  });
});
