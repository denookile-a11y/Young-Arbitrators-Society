import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeadershipPortrait, initials } from "./leadership-portrait";

const html = (src?: string | null) =>
  renderToStaticMarkup(createElement(LeadershipPortrait, { name: "Amina Wanjiku", src, className: "aspect-square" }));

describe("LeadershipPortrait", () => {
  it("renders the supplied portrait with meaningful alt text, framed on the face, lazy and async", () => {
    const out = html("https://x.supabase.co/storage/v1/object/public/images/amina.jpg");
    expect(out).toContain('src="https://x.supabase.co/storage/v1/object/public/images/amina.jpg"');
    expect(out).toContain('alt="Portrait of Amina Wanjiku"');
    expect(out).toContain("object-top");
    expect(out).toContain('loading="lazy"');
    expect(out).toContain("aspect-square");
  });

  it.each([null, undefined, ""])("falls back to a monogram, never an invented photo, when the portrait is %j", (src) => {
    const out = html(src);
    expect(out).not.toContain("<img");
    expect(out).toContain(">AW<");
    expect(out).toContain('aria-hidden="true"');
  });

  it("monogram helper: first two initials, uppercased, safe on odd input", () => {
    expect(initials("amina  wanjiku mwangi")).toBe("AW");
    expect(initials("  ")).toBe("");
    expect(initials("Cher")).toBe("C");
  });
});
