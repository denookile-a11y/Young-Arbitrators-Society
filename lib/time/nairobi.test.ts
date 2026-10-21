import { describe, expect, it } from "vitest";
import { formatNairobiDateTime, nairobiLocalToUtcIso, utcIsoToNairobiLocal } from "./nairobi";
import { isAnnouncementVisible } from "@/lib/announcements/visibility";

describe("Nairobi wall clock → UTC instant (UTC+3, no DST)", () => {
  it.each([
    ["2026-10-12T09:30", "2026-10-12T06:30:00.000Z"],
    ["2026-10-12T00:00", "2026-10-11T21:00:00.000Z"], // midnight Nairobi = previous UTC day
    ["2026-10-12T02:59", "2026-10-11T23:59:00.000Z"],
    ["2026-10-12T03:00", "2026-10-12T00:00:00.000Z"], // the exact boundary where the UTC date changes
    ["2026-10-12T23:59", "2026-10-12T20:59:00.000Z"],
    ["2026-12-31T23:30", "2026-12-31T20:30:00.000Z"],
    ["2027-01-01T00:00", "2026-12-31T21:00:00.000Z"], // crosses the year in UTC
    ["2028-02-29T12:00", "2028-02-29T09:00:00.000Z"], // leap day
    ["2026-10-12T09:30:45", "2026-10-12T06:30:45.000Z"],
  ])("%s → %s", (local, utc) => expect(nairobiLocalToUtcIso(local)).toBe(utc));

  it("empty means 'not set'", () => {
    expect(nairobiLocalToUtcIso("")).toBeUndefined();
    expect(nairobiLocalToUtcIso(undefined)).toBeUndefined();
    expect(nairobiLocalToUtcIso("   ")).toBeUndefined();
  });

  it("never converts twice: a value that already carries a zone is the same instant", () => {
    expect(nairobiLocalToUtcIso("2026-10-12T06:30:00.000Z")).toBe("2026-10-12T06:30:00.000Z");
    expect(nairobiLocalToUtcIso("2026-10-12T09:30:00+03:00")).toBe("2026-10-12T06:30:00.000Z");
    const once = nairobiLocalToUtcIso("2026-10-12T09:30")!;
    expect(nairobiLocalToUtcIso(once)).toBe(once);
  });

  it("passes malformed or impossible input through so validation can reject it", () => {
    expect(nairobiLocalToUtcIso("tomorrow")).toBe("tomorrow");
    expect(nairobiLocalToUtcIso("2026-02-30T10:00")).toBe("2026-02-30T10:00");
    expect(Number.isNaN(Date.parse(nairobiLocalToUtcIso("2026-13-01T10:00")!))).toBe(true);
  });

  it("is zone-aware rather than a fixed +3: a DST zone shifts with the season", () => {
    // Proves the implementation reads the zone database (New York: -4 summer, -5 winter).
    expect(nairobiLocalToUtcIso("2026-07-01T12:00", "America/New_York")).toBe("2026-07-01T16:00:00.000Z");
    expect(nairobiLocalToUtcIso("2026-01-01T12:00", "America/New_York")).toBe("2026-01-01T17:00:00.000Z");
  });
});

describe("UTC instant → Nairobi form value / display", () => {
  it("round-trips every representative value", () => {
    for (const local of ["2026-10-12T09:30", "2026-10-12T00:00", "2026-10-12T03:00", "2026-12-31T23:59", "2027-01-01T00:00"]) {
      expect(utcIsoToNairobiLocal(nairobiLocalToUtcIso(local))).toBe(local);
    }
  });
  it("shows a stored UTC instant in Nairobi time (not sliced from the ISO string)", () => {
    expect(utcIsoToNairobiLocal("2026-10-11T21:00:00Z")).toBe("2026-10-12T00:00");
    expect(utcIsoToNairobiLocal(null)).toBe("");
    expect(utcIsoToNairobiLocal("garbage")).toBe("");
  });
  it("formats for admin lists in Nairobi time", () => {
    expect(formatNairobiDateTime("2026-10-11T21:30:00Z")).toMatch(/12 Oct 2026/);
    expect(formatNairobiDateTime("2026-10-11T21:30:00Z")).toMatch(/00:30/);
  });
});

describe("visibility is evaluated on the correct instant", () => {
  const publishNairobi = nairobiLocalToUtcIso("2026-10-12T09:00")!; // 06:00Z
  const row = { status: "published", publish_at: publishNairobi, expires_at: null };
  it("hidden 1 minute before the Nairobi publish time, visible at it", () => {
    expect(isAnnouncementVisible(row, new Date("2026-10-12T05:59:00Z"))).toBe(false);
    expect(isAnnouncementVisible(row, new Date("2026-10-12T06:00:00Z"))).toBe(true);
  });
  it("the old naive behaviour (reading 09:00 as UTC) would have been 3 hours late", () => {
    const naive = { ...row, publish_at: "2026-10-12T09:00:00Z" };
    expect(isAnnouncementVisible(naive, new Date("2026-10-12T06:30:00Z"))).toBe(false);
    expect(isAnnouncementVisible(row, new Date("2026-10-12T06:30:00Z"))).toBe(true);
  });
  it("expiry at Nairobi midnight ends the announcement at 21:00Z the previous day", () => {
    const exp = { status: "published", publish_at: null, expires_at: nairobiLocalToUtcIso("2026-10-12T00:00")! };
    expect(isAnnouncementVisible(exp, new Date("2026-10-11T20:59:00Z"))).toBe(true);
    expect(isAnnouncementVisible(exp, new Date("2026-10-11T21:00:00Z"))).toBe(false);
  });
});
