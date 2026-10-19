import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const action = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/newsletter-reconsent", () => ({ legacyReconsentAction: action }));

import { NewsletterReconsentPanel } from "./newsletter-reconsent-panel";

const root = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("legacy re-consent panel does not act on its own", () => {
  const html = renderToStaticMarkup(createElement(NewsletterReconsentPanel));

  it("rendering never calls the action (no auto-execute on load, refresh or navigation)", () => {
    expect(action).not.toHaveBeenCalled();
  });

  it("initially offers Preview only: no Execute control exists until a preview has succeeded", () => {
    expect(html).toContain("Preview (sends no email)");
    expect(html).not.toContain("Send confirmation requests");
    expect(html).not.toContain('value="execute"');
    expect(html).toContain('value="preview"');
  });

  it("says plainly that it requests confirmation and does not establish consent", () => {
    expect(html).toMatch(/does <strong>not<\/strong> confirm anyone/);
    expect(html).toMatch(/Unsubscribed people are never contacted/);
  });

  it("has no effects, timers or submit-on-change behaviour in its source", () => {
    const src = read("components/admin/newsletter-reconsent-panel.tsx");
    expect(src).not.toMatch(/useEffect|useLayoutEffect|setTimeout|setInterval|requestSubmit|\.submit\(/);
    // The execute button is disabled until the box is ticked, and only exists inside the preview branch.
    expect(src).toMatch(/disabled=\{!ack \|\| pending\}/);
    expect(src).toMatch(/state\.status === "preview"/);
  });

  it("the page offers the panel to super admins only, and never calls the service during render", () => {
    const page = read("app/admin/(dashboard)/newsletter/page.tsx");
    expect(page).toMatch(/hasRole\(admin, "super_admin"\)/);
    expect(page).toMatch(/canReconsent && <NewsletterReconsentPanel/);
    expect(page).not.toMatch(/requestLegacyReconsent|getConsentSummary/);
  });
});
