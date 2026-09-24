import { describe, it, expect } from "vitest";
import { isSafeAdminRedirect } from "./redirect-safety";

describe("isSafeAdminRedirect", () => {
  it("accepts same-app /admin paths", () => {
    expect(isSafeAdminRedirect("/admin")).toBe(true);
    expect(isSafeAdminRedirect("/admin/dashboard")).toBe(true);
    expect(isSafeAdminRedirect("/admin/projects/123")).toBe(true);
    expect(isSafeAdminRedirect("/admin/publications/00000000-0000-0000-0000-000000000000")).toBe(
      true
    );
  });

  it("rejects absolute external URLs", () => {
    expect(isSafeAdminRedirect("https://evil.example")).toBe(false);
    expect(isSafeAdminRedirect("http://evil.example/admin")).toBe(false);
    expect(isSafeAdminRedirect("https://evil.example/admin/dashboard")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeAdminRedirect("//evil.example")).toBe(false);
    expect(isSafeAdminRedirect("//evil.example/admin")).toBe(false);
  });

  it("rejects javascript: and other non-http schemes", () => {
    expect(isSafeAdminRedirect("javascript:alert(1)")).toBe(false);
    expect(isSafeAdminRedirect("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects a value that starts with /admin but embeds a scheme later", () => {
    // e.g. an attacker-crafted "/admin@evil.example" or a path that smuggles
    // "://" further in — the `.includes("://")` check catches this even
    // though the string technically starts with "/admin".
    expect(isSafeAdminRedirect("/admin/redirect?to=https://evil.example")).toBe(false);
  });

  it("rejects paths outside /admin", () => {
    expect(isSafeAdminRedirect("/")).toBe(false);
    expect(isSafeAdminRedirect("/login")).toBe(false);
  });

  it("rejects paths that merely share the /admin prefix (v10 fix)", () => {
    // Previously `value.startsWith("/admin")` accepted all of these.
    expect(isSafeAdminRedirect("/administrator")).toBe(false);
    expect(isSafeAdminRedirect("/admin-panel")).toBe(false);
    expect(isSafeAdminRedirect("/admin.evil.com")).toBe(false);
    expect(isSafeAdminRedirect("/admin@evil.com")).toBe(false);
  });

  it("rejects backslash variants that some browsers/proxies treat as slashes", () => {
    expect(isSafeAdminRedirect("/admin\\@evil.example")).toBe(false);
    expect(isSafeAdminRedirect("\\/admin")).toBe(false);
    expect(isSafeAdminRedirect("/admin\\evil.example")).toBe(false);
  });

  it("rejects values containing whitespace or control characters", () => {
    expect(isSafeAdminRedirect("/admin\n/evil")).toBe(false);
    expect(isSafeAdminRedirect("/admin\t/evil")).toBe(false);
    expect(isSafeAdminRedirect("/admin ")).toBe(false);
    expect(isSafeAdminRedirect(" /admin")).toBe(false);
  });

  it("rejects malformed, empty, or missing values", () => {
    expect(isSafeAdminRedirect("")).toBe(false);
    expect(isSafeAdminRedirect(null)).toBe(false);
    expect(isSafeAdminRedirect(undefined)).toBe(false);
    expect(isSafeAdminRedirect(123)).toBe(false);
    expect(isSafeAdminRedirect(["/admin"])).toBe(false);
    expect(isSafeAdminRedirect({})).toBe(false);
  });
});
