"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

const PRIMARY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Leadership", href: "/leadership" },
  { label: "Departments", href: "/departments" },
  { label: "Moot", href: "/moot" },
  { label: "Research", href: "/research" },
  { label: "Events", href: "/events" },
];

const MORE_LINKS = [
  { label: "Conferences", href: "/conferences" },
  { label: "Publications", href: "/publications" },
  { label: "Gallery", href: "/gallery" },
  { label: "Partners", href: "/partners" },
  { label: "CSR", href: "/csr" },
  { label: "Archive", href: "/archive" },
];

export function SiteNav({ transparentOnHero = false }: { transparentOnHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = transparentOnHero && !scrolled;

  return (
    <header
      className={clsx(
        "top-0 z-[100] w-full transition-colors duration-300",
        transparentOnHero ? "fixed" : "sticky",
        onHero
          ? "bg-transparent"
          : "border-b border-hairline bg-white/86 backdrop-blur-lg shadow-[0_1px_24px_rgba(10,26,60,0.06)]"
      )}
    >
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className={clsx(
            "flex items-center gap-2.5 font-serif text-[1.3rem] font-medium",
            onHero ? "text-white" : "text-ink"
          )}
        >
          <span
            className={clsx(
              "flex h-[30px] w-[30px] items-center justify-center rounded-full border text-sm",
              onHero ? "border-white text-white" : "border-navy-deep text-navy-deep"
            )}
          >
            Y
          </span>
          Young Arbitrators Society
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {PRIMARY_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(
                  "group relative pb-1 text-[0.85rem] font-semibold whitespace-nowrap",
                  onHero ? "text-white/85 hover:text-white" : "text-ink-soft hover:text-navy-deep"
                )}
              >
                {link.label}
                <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-gold transition-all duration-200 group-hover:w-full" />
              </Link>
            </li>
          ))}

          <li className="group relative">
            <button
              className={clsx(
                "flex items-center gap-1.5 pb-1 text-[0.85rem] font-semibold whitespace-nowrap",
                onHero ? "text-white/85 group-hover:text-white" : "text-ink-soft group-hover:text-navy-deep"
              )}
            >
              More
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-[11px] w-[11px] transition-transform group-hover:rotate-180">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="invisible absolute left-1/2 top-full min-w-[190px] -translate-x-1/2 translate-y-[-6px] rounded-[2px] border border-hairline bg-white p-2 opacity-0 shadow-[0_18px_40px_rgba(10,26,60,0.14)] transition-all duration-200 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-[2px] px-3 py-2.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-off-white hover:text-navy-deep"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </li>

          <li>
            <Link
              href="/search"
              aria-label="Search"
              className={clsx(
                "flex items-center rounded-full p-1.5",
                onHero ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-soft hover:bg-off-white hover:text-navy-deep"
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>
          </li>

          <li>
            <Link
              href="/join"
              className="rounded-[2px] bg-navy-deep px-[22px] py-[11px] text-[0.82rem] font-bold text-white transition-colors hover:bg-navy-mid"
            >
              Join YAS
            </Link>
          </li>

          <li>
            <Link
              href="/admin"
              className={clsx(
                "text-[0.76rem] font-semibold opacity-60 hover:opacity-100 whitespace-nowrap",
                onHero ? "text-white/60" : "text-ink-soft"
              )}
            >
              Admin
            </Link>
          </li>
        </ul>

        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex flex-col gap-[5px] p-1 md:hidden"
        >
          <span className={clsx("block h-[1.5px] w-[22px]", onHero ? "bg-white" : "bg-navy-deep")} />
          <span className={clsx("block h-[1.5px] w-[22px]", onHero ? "bg-white" : "bg-navy-deep")} />
          <span className={clsx("block h-[1.5px] w-[22px]", onHero ? "bg-white" : "bg-navy-deep")} />
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-hairline bg-white px-6 py-6 md:hidden">
          <ul className="flex flex-col gap-1">
            {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-[2px] px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-off-white hover:text-navy-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/join"
                onClick={() => setMobileOpen(false)}
                className="block rounded-[2px] bg-navy-deep px-4 py-3 text-center text-sm font-bold text-white"
              >
                Join YAS
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
