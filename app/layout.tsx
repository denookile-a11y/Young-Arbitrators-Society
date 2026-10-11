import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PremiumExperience } from "@/components/ui/premium-experience";

// Self-hosted (SIL OFL) so the type renders identically online or offline and
// needs no third-party request: Cormorant Garamond (display serif) + Manrope (UI sans).
const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});
const manrope = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  // Required for next/metadata to resolve relative OG image URLs (used on
  // Research/Events/Conferences/Publications detail pages) into absolute
  // ones. Without this, Next.js falls back to a warning and Open Graph
  // previews on social platforms silently break. Falls back to the same
  // placeholder as sitemap.ts/robots.ts — set NEXT_PUBLIC_SITE_URL to the
  // real production domain before shipping.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://yas.example.com"),
  title: {
    default: "Young Arbitrators Society — Kenyatta University School of Law",
    template: "%s — Young Arbitrators Society",
  },
  description:
    "Young Arbitrators Society — Kenyatta University School of Law. Shaping the next generation of arbitration and ADR practitioners.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        {children}
        <PremiumExperience />
      </body>
    </html>
  );
}
