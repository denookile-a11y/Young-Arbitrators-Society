import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    heading: "Explore",
    links: [
      { label: "About", href: "/about" },
      { label: "Leadership", href: "/leadership" },
      { label: "Departments", href: "/departments" },
      { label: "Archive", href: "/archive" },
    ],
  },
  {
    heading: "Programmes",
    links: [
      { label: "Moot Court", href: "/moot" },
      { label: "Research", href: "/research" },
      { label: "Conferences", href: "/conferences" },
      { label: "CSR", href: "/csr" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Publications", href: "/publications" },
      { label: "Gallery", href: "/gallery" },
      { label: "Partners", href: "/partners" },
      { label: "Join YAS", href: "/join" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-white px-6 pb-9 pt-20 md:px-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-[70px] grid grid-cols-1 gap-9 sm:grid-cols-2 md:grid-cols-5 md:gap-[50px]">
          <div>
            <div className="mb-3.5 font-serif text-[1.3rem]">Young Arbitrators Society</div>
            <p className="max-w-[280px] text-sm leading-relaxed text-ink-soft">
              A student-led institution at Kenyatta University School of Law,
              dedicated to the study and practice of arbitration and
              alternative dispute resolution.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-5 text-xs font-extrabold tracking-wide text-navy-deep">
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-navy-deep"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-5 text-xs font-extrabold tracking-wide text-navy-deep">
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@yas-ku.org"
                  className="text-sm text-ink-soft transition-colors hover:text-navy-deep"
                >
                  info@yas-ku.org
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-ink-soft transition-colors hover:text-navy-deep"
                >
                  Contact Form
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-[30px] text-sm text-ink-soft">
          <span>© 2026 Young Arbitrators Society — Kenyatta University School of Law</span>
          <div className="flex gap-6">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
