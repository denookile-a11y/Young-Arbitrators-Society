import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(import.meta.dirname, "video-hero.tsx"), "utf8");

describe("homepage hero media frame", () => {
  it("poster and video live in ONE frame, so they always cover the same area", () => {
    const frame = src.indexOf('<div aria-hidden className="pointer-events-none absolute inset-0">');
    const picture = src.indexOf("<picture>");
    const video = src.indexOf("<video\n"); // the element itself, not the mention in the header comment
    const overlay = src.indexOf("{/* Layer 3");
    expect(frame).toBeGreaterThan(-1);
    expect(frame).toBeLessThan(picture);
    expect(picture).toBeLessThan(video);
    expect(video).toBeLessThan(overlay);
    expect(src.slice(frame, overlay)).toContain("        </div>\n      </div>"); // inner and outer frame both closed before the overlays
  });

  it("phones: the frame is one screen tall and pinned; the hero clips (not hides) so sticky works", () => {
    for (const cls of [
      "supports-[overflow:clip]:max-md:sticky",
      "supports-[overflow:clip]:max-md:top-0",
      "supports-[overflow:clip]:max-md:h-screen",
      "supports-[overflow:clip]:max-md:max-h-full",
      "supports-[overflow:clip]:max-md:overflow-clip",
    ]) expect(src, cls).toContain(cls);
  });

  it("desktop and tablet are untouched: sticky and screen height only ever apply below the md breakpoint", () => {
    for (const m of src.matchAll(/[^\s"]*(?:sticky|h-screen|overflow-clip)\b/g)) expect(m[0], m[0]).toMatch(/max-md:/);
    expect(src).toContain("min-h-[92vh]");
    expect(src).toMatch(/className="relative h-full w-full /); // frame equals the whole hero by default
  });

  it("keeps the established behaviour: portrait source, cover (never stretch), autoplay safeguards", () => {
    expect(src).toContain('const NARROW = "(max-width: 767px)"');
    expect(src).toContain('"/video/yas-live-portrait.mp4"');
    expect(src).toContain('"/img/yas-live-poster-portrait.jpg"');
    expect(src).toContain("absolute inset-0 h-full w-full object-cover");
    for (const t of ["autoPlay", "muted", "loop", "playsInline", "saveData", "IntersectionObserver", "visibilitychange"]) expect(src, t).toContain(t);
    expect(src).not.toMatch(/object-(fill|contain)/);
  });
});
