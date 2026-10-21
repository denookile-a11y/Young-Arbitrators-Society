import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Department, Profile } from "@/types/database";
import type { LeadershipRoleWithProfile } from "./leadership";

const h = vi.hoisted(() => ({ edition: vi.fn(), roles: vi.fn() }));
vi.mock("@/lib/queries/leadership", () => ({ getCurrentEdition: h.edition, listLeadershipRolesForEdition: h.roles }));

import { listHomepageLeaders, selectHomepageCommittee } from "./homepage-leaders";
import { LeadershipSection } from "@/components/home/leadership-section";

let n = 0;
const profile = (name: string, over: Partial<Profile> = {}): Profile => ({
  id: `p${++n}`, slug: name.toLowerCase().replace(/\s+/g, "-"), full_name: name, portrait_url: `https://img.test/${name}.jpg`,
  bio: `Bio of ${name}`, email: null, linkedin_url: null, twitter_url: null, status: "published",
  created_at: "", updated_at: "", ...over,
});
const role = (name: string, over: Partial<LeadershipRoleWithProfile> & { p?: Partial<Profile> | null } = {}): LeadershipRoleWithProfile => {
  const { p, ...rest } = over;
  return {
    id: `r${++n}`, edition_id: "ed-current", profile_id: "x", role_title: `Role of ${name}`, department_id: null,
    is_executive: false, order_index: 0, status: "published", created_at: "", updated_at: "",
    profile: p === null ? null : profile(name, p ?? {}), department: null, ...rest,
  } as LeadershipRoleWithProfile;
};
const names = (roles: ReturnType<typeof selectHomepageCommittee>) => roles.map((r) => r.profile.full_name);

describe("selectHomepageCommittee — who appears on the homepage", () => {
  it("includes a current EXECUTIVE", () => expect(names(selectHomepageCommittee([role("Pres", { is_executive: true })]))).toEqual(["Pres"]));
  it("includes a current NON-executive committee member (the reported defect)", () => expect(names(selectHomepageCommittee([role("Head of Moot")]))).toEqual(["Head of Moot"]));
  it("includes executives and non-executives together", () => {
    expect(names(selectHomepageCommittee([role("Exec", { is_executive: true }), role("Member")]))).toEqual(["Exec", "Member"]);
  });
  it("has NO artificial limit (4, 10 or 25 members all appear)", () => {
    for (const count of [4, 5, 12, 25]) {
      const roles = Array.from({ length: count }, (_, i) => role(`Person ${String(i).padStart(2, "0")}`, { order_index: i }));
      expect(selectHomepageCommittee(roles)).toHaveLength(count);
    }
  });
  it("orders executives first, then by order_index, then by name", () => {
    const out = selectHomepageCommittee([
      role("Zed", { order_index: 1 }), role("Amy", { order_index: 1 }), role("Boss", { order_index: 9, is_executive: true }),
      role("First", { order_index: 0 }), role("Vice", { order_index: 2, is_executive: true }),
    ]);
    expect(names(out)).toEqual(["Vice", "Boss", "First", "Amy", "Zed"]);
  });
  it("excludes an unpublished (draft/review/archived) role", () => {
    for (const status of ["draft", "review", "archived"] as const)
      expect(selectHomepageCommittee([role("A", { status })])).toEqual([]);
  });
  it("excludes a person whose profile is unpublished", () => {
    expect(selectHomepageCommittee([role("A", { p: { status: "draft" } })])).toEqual([]);
  });
  it("excludes a role whose profile RLS hid (embedded profile is null) instead of showing 'Unassigned'", () => {
    expect(selectHomepageCommittee([role("Hidden", { p: null })])).toEqual([]);
  });
  it("shows a person once even if they hold several roles in the edition (highest-ranked role)", () => {
    const shared = profile("Dual");
    const out = selectHomepageCommittee([
      { ...role("x", { order_index: 5 }), profile: shared, role_title: "Secretary" },
      { ...role("x", { order_index: 1, is_executive: true }), profile: shared, role_title: "Vice President" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].role_title).toBe("Vice President");
  });
});

describe("listHomepageLeaders — current edition scoping (same definition as /leadership)", () => {
  beforeEach(() => { h.edition.mockReset(); h.roles.mockReset(); });
  it("asks for the CURRENT edition's roles only", async () => {
    h.edition.mockResolvedValue({ id: "ed-current" });
    h.roles.mockResolvedValue([role("A")]);
    expect(await listHomepageLeaders()).toHaveLength(1);
    expect(h.roles).toHaveBeenCalledWith("ed-current");
  });
  it("shows nobody when no edition is current (an old edition never stands in)", async () => {
    h.edition.mockResolvedValue(null);
    expect(await listHomepageLeaders()).toEqual([]);
    expect(h.roles).not.toHaveBeenCalled();
  });
  it("propagates a database failure (so the page can show an error, not an empty section)", async () => {
    h.edition.mockRejectedValue(new Error("db down"));
    await expect(listHomepageLeaders()).rejects.toThrow("db down");
  });
});

describe("LeadershipSection rendering", () => {
  const html = (leaders: ReturnType<typeof selectHomepageCommittee>, failed = false) =>
    renderToStaticMarkup(createElement(LeadershipSection, { leaders, failed }));

  it("renders the portrait, name, committee role and existing bio for each member", () => {
    const out = html(selectHomepageCommittee([role("Wanjiru Kamau", { is_executive: true, role_title: "President" })]));
    expect(out).toContain('src="https://img.test/Wanjiru Kamau.jpg"');
    expect(out).toContain("Wanjiru Kamau");
    expect(out).toContain("President");
    expect(out).toContain("Bio of Wanjiru Kamau");
    expect(out).toContain('href="/leadership/wanjiru-kamau"');
  });
  it("falls back to initials (no broken <img>) when there is no portrait", () => {
    const out = html(selectHomepageCommittee([role("Brian Otieno", { p: { portrait_url: null } })]));
    expect(out).not.toContain("<img");
    expect(out).toContain(">BO<");
  });
  it("shows the department for committee members and omits a missing bio gracefully", () => {
    const dept = { name: "Mooting" } as Department;
    const out = html(selectHomepageCommittee([role("Dee", { department: dept, p: { bio: null } })]));
    expect(out).toContain("Mooting");
    expect(out).not.toContain("line-clamp-2 text-xs");
  });
  it("renders executives and committee in two groups, with all 9 members present", () => {
    const roles = [role("E1", { is_executive: true }), role("E2", { is_executive: true }), ...Array.from({ length: 7 }, (_, i) => role(`C${i}`))];
    const out = html(selectHomepageCommittee(roles));
    expect(out).toContain("Department Heads &amp; Committee");
    for (const nme of ["E1", "E2", "C0", "C1", "C2", "C3", "C4", "C5", "C6"]) expect(out).toContain(`>${nme}<`);
  });
  it("shows an error state when the query failed", () => {
    expect(html([], true)).toContain('role="alert"');
  });
  it("never vanishes silently when there are no members: the heading stays, with an honest message and no member links", () => {
    const out = html([]);
    expect(out).toContain("The minds behind the motion");
    expect(out).toContain("The People Behind YAS");
    expect(out).toMatch(/introduced here as soon as profiles are published/);
    expect(out).not.toContain('role="alert"');
    expect(out).not.toMatch(/href="\/leadership\/[a-z0-9-]+"/); // no biography links without people
  });
  it("uses the required headline and supporting copy", () => {
    const out = html([]);
    expect(out).toContain("The minds behind the motion…");
    expect(out).toMatch(/arbitration, legal scholarship, advocacy and leadership/);
  });
});
