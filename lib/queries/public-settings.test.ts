import { describe, expect, it } from "vitest";
import { CONTACT_DEFAULTS, parseContactSettings } from "./public-settings";

describe("parseContactSettings", () => {
  it("falls back to defaults only for keys that were never saved", () => {
    expect(parseContactSettings([])).toEqual(CONTACT_DEFAULTS);
  });
  it("shows saved values", () => {
    expect(parseContactSettings([
      { key: "contact_email", value: "hello@yas.example" },
      { key: "instagram_handle", value: "@yas_new" },
      { key: "linkedin_url", value: "https://linkedin.com/company/yas" },
    ])).toEqual({ contactEmail: "hello@yas.example", instagramHandle: "yas_new", linkedinUrl: "https://linkedin.com/company/yas" });
  });
  it("honours a cleared optional field (admin removed it) instead of resurrecting the default", () => {
    const s = parseContactSettings([{ key: "instagram_handle", value: "" }, { key: "linkedin_url", value: "" }]);
    expect(s.instagramHandle).toBe("");
    expect(s.linkedinUrl).toBe("");
  });
  it("never yields an empty contact email", () => {
    expect(parseContactSettings([{ key: "contact_email", value: "  " }]).contactEmail).toBe(CONTACT_DEFAULTS.contactEmail);
  });
  it("ignores non-string stored values", () => {
    expect(parseContactSettings([{ key: "contact_email", value: { x: 1 } }]).contactEmail).toBe(CONTACT_DEFAULTS.contactEmail);
  });
});
