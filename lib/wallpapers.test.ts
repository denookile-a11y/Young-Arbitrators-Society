import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { ADMIN_WALLPAPERS, WALLPAPERS, heroImage, type WallpaperKey } from "./wallpapers";

const root = resolve(import.meta.dirname, "..");
const sha = (p: string) => createHash("sha256").update(readFileSync(join(root, p))).digest("hex");

/** Frozen at the moment the register was introduced. If one of these changes,
 *  a PROTECTED existing wallpaper was edited, replaced or reassigned. */
const FROZEN = {
  "hashes": {
    "wallpaper-digital-law.jpg": "a8e34e097a5ad5a067f11abf8d57bf2b54611d1cec1954e712fb779b4ca0aa23",
    "wallpaper-gavel-scales.jpg": "62749b37e43409b65d82e704e7ca6541ef5b5838410918aada7da7c299863ff3",
    "wallpaper-justice-statue.jpg": "6ce5814efb12a06920912fef5a53a79c8e4779f0c910faea716d8031c53d3a1f",
    "wallpaper-ku-amphitheatre.jpg": "6eea6dbf1f92b7373656f428d398b56ff22f71cd7e27d1fea63793efec6018be",
    "wallpaper-ku-fountain.jpg": "f5388cfbd6569fe323e0090b7379739f984371489db5705d8c795b3b38487e93",
    "wallpaper-ku-gate.jpg": "9709e5ffe1d854b02654db72a40e312949b2f453a9a0b73ce2718441c29cbd6b",
    "wallpaper-nairobi-night.jpg": "17b3c576e0fb404d822d9af09a3ce175915c66b1cd34c86ee7bf8dbf2193f1e7",
    "wallpaper-nairobi-sunset-1.jpg": "6cb1a04c6bd85f78ce3c8baa3a8633b13a127229e5d48af3e16e3ce8ea4af61c",
    "wallpaper-nairobi-sunset-2.jpg": "3b72487be9a77fc664bbbaa7e97627cffabd12adb669d3efcdcb4f4b403c6b17",
    "wallpaper-scales-document.jpg": "b9e414454516e35d67f4b08f7f41d5369b72014b444442d086914aea2213d062",
    "yas-atmosphere.jpg": "f506affdf2e1ec0c1bf13f33d8c490d775833213301c22d00e47ec1ae8f96701",
    "yas-hero-poster.jpg": "75220b4de256392f28e5e2c4aabf09ba5f7538f7377f30c662c187d760c797ee",
    "yas-live-poster-portrait.jpg": "32e6efb5e130e1e5a1ac8d926a974b3a30587efafed46754bca28c30312e6d1b",
    "yas-live-poster.jpg": "69bae275c0142b9448199109bec89286c38ef99368b47d9d3911fef28aca91e7",
    "yas-logo-web.jpg": "52516723eee35ea2130f35d124c769cafd2a4e502c77f9119fd4e5b59de263e9",
    "departments/conferences.jpg": "2783e2bb372d64082a7585c0d1f273204dffaf8bd0447cb9f5175c1357195e90",
    "departments/csr.jpg": "81ce0896e9c4fac72452f0198202cbc5f33bdf51460a60e459ebbb3a97b76be7",
    "departments/executive-committee.jpg": "06277ce23e49ec3464ad7b0c79c812e21cb358b9ca194b111943402f59acedfe",
    "departments/mooting.jpg": "2d65ecf44e30b91d1df2491b8cc6d1e7852ee46562d1f05f515aac540bc750e6",
    "departments/neutral-balance.jpg": "0cdd25e59ae5220c43c6e49d3e8d23c1a5cdc261d76bd794558ca36b4acd9377",
    "departments/neutral-globe.jpg": "11a135491a3b87b7acc442109d4b9b73fff47b0468ff9d273b91d49c225cfd39",
    "departments/publications.jpg": "e920a5b50456458ee9e655511f2e8b86b1dfb558c5e021f6f506ed33354868c7",
    "departments/research.jpg": "b3cdcc36ee8533f7797c1155786075c77873baa74f1199c0453f08e49c395e7b",
    "departments/training.jpg": "1a5fa8abf0f07a5199444c11992c8d133d754547f2930330064943bd93f8384b"
  },
  "assign": {
    "app/about/page.tsx": [
      "wallpaper-ku-fountain.jpg"
    ],
    "app/admin/(dashboard)/layout.tsx": [
      "yas-logo-web.jpg"
    ],
    "app/archive/page.tsx": [
      "wallpaper-ku-gate.jpg"
    ],
    "app/conferences/page.tsx": [
      "wallpaper-gavel-scales.jpg"
    ],
    "app/contact/page.tsx": [
      "wallpaper-nairobi-sunset-2.jpg"
    ],
    "app/csr/page.tsx": [
      "wallpaper-scales-document.jpg"
    ],
    "app/departments/page.tsx": [
      "wallpaper-ku-amphitheatre.jpg"
    ],
    "app/events/page.tsx": [
      "wallpaper-gavel-scales.jpg"
    ],
    "app/gallery/page.tsx": [
      "wallpaper-scales-document.jpg"
    ],
    "app/globals.css": [
      "yas-atmosphere.jpg"
    ],
    "app/join/page.tsx": [
      "wallpaper-nairobi-sunset-1.jpg"
    ],
    "app/moot/page.tsx": [
      "wallpaper-gavel-scales.jpg"
    ],
    "app/partners/page.tsx": [
      "wallpaper-nairobi-night.jpg"
    ],
    "app/publications/page.tsx": [
      "wallpaper-digital-law.jpg"
    ],
    "app/research/page.tsx": [
      "wallpaper-gavel-scales.jpg"
    ],
    "components/admin/admin-mobile-nav.tsx": [
      "yas-logo-web.jpg"
    ],
    "components/hero/video-hero.tsx": [
      "yas-live-poster-portrait.jpg",
      "yas-live-poster.jpg"
    ],
    "components/hero/yas-seal.tsx": [
      "yas-logo-web.jpg"
    ],
    "components/navigation/site-footer.tsx": [
      "yas-logo-web.jpg"
    ],
    "components/navigation/site-nav.tsx": [
      "yas-logo-web.jpg"
    ],
    "lib/department-visuals.ts": [
      "departments/conferences.jpg",
      "departments/csr.jpg",
      "departments/executive-committee.jpg",
      "departments/mooting.jpg",
      "departments/neutral-balance.jpg",
      "departments/neutral-globe.jpg",
      "departments/publications.jpg",
      "departments/research.jpg",
      "departments/training.jpg"
    ]
  }
} as { hashes: Record<string, string>; assign: Record<string, string[]> };

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(n) && !/\.test\.ts$/.test(n)) out.push(p);
  }
  return out;
}
const sources = ["app", "components", "lib"].flatMap((d) => walk(join(root, d)));
// Platform-independent: always a forward-slash path relative to the project root (also on Windows).
const rel = (f: string) => relative(root, f).split(sep).join("/");
const entries = Object.entries(WALLPAPERS) as [WallpaperKey, (typeof WALLPAPERS)[WallpaperKey]][];

describe("new wallpapers: one image, one destination", () => {
  it("no image path is used twice", () => {
    const srcs = entries.map(([, w]) => w.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
  it("no destination has two images", () => {
    const dests = entries.map(([, w]) => w.destination);
    expect(new Set(dests).size).toBe(dests.length);
  });
  it("every file exists, and no two image FILES are byte-identical (no copy under another name)", () => {
    const all = [...readdirSync(join(root, "public/img")).filter((f) => /\.jpe?g$/.test(f)).map((f) => "public/img/" + f),
      ...readdirSync(join(root, "public/img/departments")).map((f) => "public/img/departments/" + f)];
    for (const [, w] of entries) expect(existsSync(join(root, "public", w.src)), w.src).toBe(true);
    const seen = new Map<string, string>();
    for (const f of all) { const h = sha(f); expect(seen.get(h), `${f} duplicates ${seen.get(h)}`).toBeUndefined(); seen.set(h, f); }
  });
  it("each destination is a real public route", () => {
    for (const [, w] of entries) {
      const dest: string = w.destination;
      // /departments/<slug> is served by the dynamic route template.
      const seg = /^\/departments\/[a-z-]+$/.test(dest) ? "/departments/[slug]" : dest === "/" ? "" : dest;
      expect(existsSync(join(root, "app", seg, "page.tsx")), w.destination).toBe(true);
    }
  });
  it("each wallpaper is applied through heroImage(<key>) on exactly ONE page, and nowhere else", () => {
    for (const [key, w] of entries) {
      const users = sources.filter((f) => new RegExp(`heroImage\\("${key}"\\)`).test(readFileSync(f, "utf8"))).map(rel);
      expect(users, key).toHaveLength(1);
      // A department-specific wallpaper is selected in lib/department-wallpapers.ts (called by the
      // shared template); every other wallpaper is applied on its own page file.
      const file = /^\/departments\/[a-z-]+$/.test(w.destination) ? "lib/department-wallpapers.ts" : w.destination === "/terms" ? "app/terms/page.tsx" : `app${w.destination}/page.tsx`;
      expect(users[0], key).toBe(file);
      const direct = sources.filter((f) => rel(f) !== "lib/wallpapers.ts" && readFileSync(f, "utf8").includes(w.src.split("/").pop()!)).map(rel);
      expect(direct, `${key} referenced directly`).toEqual([]);
    }
  });
  it("heroImage() returns the registered values and opts into the branded fallback", () => {
    for (const [key, w] of entries) expect(heroImage(key)).toEqual({ src: w.src, alt: w.alt, focus: w.focus, branded: true });
    expect(readFileSync(join(root, "components/ui/page-hero.tsx"), "utf8")).toContain("image.branded");
  });
  it("the human-readable register lists every wallpaper and its destination", () => {
    const doc = readFileSync(join(root, "docs/WALLPAPER_REGISTER.md"), "utf8");
    for (const [, w] of entries) { expect(doc).toContain(w.src.split("/").pop()!); expect(doc).toContain(w.destination); }
    for (const w of Object.values(ADMIN_WALLPAPERS)) { expect(doc).toContain(w.src.split("/").pop()!); expect(doc).toContain(w.destination); }
  });
});

describe("admin backgrounds: one image, one destination, never shared with a public page", () => {
  const admin = Object.entries(ADMIN_WALLPAPERS);
  it("distinct images and destinations, none reused from the public registry", () => {
    const all = [...entries.map(([, w]) => w.src), ...admin.map(([, w]) => w.src)];
    expect(new Set(all).size).toBe(all.length);
    const dests = [...entries.map(([, w]) => w.destination), ...admin.map(([, w]) => w.destination)];
    expect(new Set(dests).size).toBe(dests.length);
  });
  it("files exist and are distinct from every other image file", () => {
    for (const [, w] of admin) expect(existsSync(join(root, "public", w.src)), w.src).toBe(true);
    const hashes = [...entries.map(([, w]) => w.src), ...admin.map(([, w]) => w.src)].map((src) => sha("public" + src));
    expect(new Set(hashes).size).toBe(hashes.length);
  });
  it("each is used by exactly one file: the login page and the dashboard page", () => {
    const users = (name: string) => sources.filter((f) => readFileSync(f, "utf8").includes(`ADMIN_WALLPAPERS.${name}`)).map(rel);
    expect(users("login")).toEqual(["app/admin/login/page.tsx"]);
    expect(users("dashboard")).toEqual(["app/admin/(dashboard)/page.tsx"]);
  });
  it("the login image stays beneath the existing atmosphere overlay (z-index -1) and the atmosphere class is kept", () => {
    const login = readFileSync(join(root, "app/admin/login/page.tsx"), "utf8");
    expect(login).toContain("atmosphere");
    expect(login).toContain("z-[-1]");
    expect(login).toContain('alt=""');
  });
  it("the dashboard banner wraps only the title, with a branded fallback behind the image", () => {
    const page = readFileSync(join(root, "app/admin/(dashboard)/page.tsx"), "utf8");
    expect(page).toContain("from-navy-deep via-[#0d2148] to-navy-mid");
    expect(page.indexOf("</header>")).toBeLessThan(page.indexOf("Total Members"));
  });
});

describe("existing wallpapers are protected", () => {
  it("every pre-existing image file is byte-for-byte unchanged", () => {
    for (const [name, hash] of Object.entries(FROZEN.hashes)) expect(sha("public/img/" + name), name).toBe(hash);
  });
  it("every pre-existing image is still referenced by the same files (no reassignment, relocation or removal)", () => {
    for (const [file, imgs] of Object.entries(FROZEN.assign)) {
      const src = readFileSync(join(root, file), "utf8");
      for (const img of imgs) expect(src, `${file} -> ${img}`).toContain(img);
    }
  });
  it("no existing page uses a newly registered wallpaper", () => {
    for (const [file] of Object.entries(FROZEN.assign)) {
      const src = readFileSync(join(root, file), "utf8");
      for (const [, w] of entries) expect(src.includes(w.src.split("/").pop()!), `${file} borrows ${w.src}`).toBe(false);
    }
  });
});
