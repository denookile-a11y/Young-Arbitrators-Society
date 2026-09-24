import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
