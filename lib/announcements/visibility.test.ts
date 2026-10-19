import { describe, expect, it } from "vitest";
import { isAnnouncementVisible, visibilityWindowFilter } from "./visibility";

const now = new Date("2026-10-11T12:00:00Z");
const past = "2026-10-01T00:00:00Z";
const future = "2026-11-01T00:00:00Z";
const a = (over: Partial<{ status: string; publish_at: string | null; expires_at: string | null }> = {}) => ({ status: "published", publish_at: null, expires_at: null, ...over });

describe("announcement visibility", () => {
  it("published with no window is visible", () => expect(isAnnouncementVisible(a(), now)).toBe(true));
  it.each(["draft", "review", "archived"])("%s is never visible", (status) => expect(isAnnouncementVisible(a({ status }), now)).toBe(false));
  it("scheduled for the future is hidden until it goes live", () => {
    expect(isAnnouncementVisible(a({ publish_at: future }), now)).toBe(false);
    expect(isAnnouncementVisible(a({ publish_at: future }), new Date("2026-11-02T00:00:00Z"))).toBe(true);
  });
  it("expired is hidden; not-yet-expired is visible", () => {
    expect(isAnnouncementVisible(a({ expires_at: past }), now)).toBe(false);
    expect(isAnnouncementVisible(a({ expires_at: future }), now)).toBe(true);
  });
  it("inside an explicit window is visible", () => expect(isAnnouncementVisible(a({ publish_at: past, expires_at: future }), now)).toBe(true));
  it("the database filter covers all four null/non-null combinations with a single or=", () => {
    const f = visibilityWindowFilter(now);
    expect(f.split("),and(").length).toBe(4);
    expect(f).toContain("publish_at.lte.2026-10-11T12:00:00.000Z");
    expect(f).toContain("expires_at.gt.2026-10-11T12:00:00.000Z");
  });
});
