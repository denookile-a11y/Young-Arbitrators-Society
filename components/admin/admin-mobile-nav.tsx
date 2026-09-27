"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

/**
 * Mobile-only nav drawer for the admin dashboard. Renders a hamburger
 * trigger in the header (visible below `lg`) and a slide-in panel with
 * the same links the desktop sidebar shows. The desktop sidebar itself
 * is untouched — this component only exists at narrow widths.
 */
export function AdminMobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on route change so it doesn't stay open after
  // navigating. Adjusting state during render (rather than in an effect)
  // is the recommended React pattern for resetting state in response to a
  // prop/value change — it avoids the extra render + cascading-render risk
  // that `setState` inside a `useEffect` keyed on `pathname` would cause.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[2px] border border-hairline text-ink-soft"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
          <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy-deep/40"
          />
          <nav
            className="absolute inset-y-0 left-0 w-[82vw] max-w-[300px] overflow-y-auto bg-white px-5 py-5 shadow-xl"
            aria-label="Admin navigation"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 font-serif text-base text-navy-deep">
                <span className="relative h-6 w-6 flex-none overflow-hidden rounded-full ring-1 ring-navy-deep/20">
                  <Image src="/img/yas-logo-web.jpg" alt="" fill sizes="24px" className="object-cover" />
                </span>
                YAS Admin
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-hairline text-ink-soft"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 1l10 10M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-[2px] px-3.5 py-2.5 hover:bg-off-white hover:text-navy-deep"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
