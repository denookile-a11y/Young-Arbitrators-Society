import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { logoutAction } from "@/lib/auth/actions";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import type { Admin } from "@/types/database";

const NAV_SECTIONS: {
  label: string;
  href: string;
  minRole?: "admin" | "super_admin";
  /** Overrides minRole when set — used only where department_admin needs a
   *  narrower rule than "hidden entirely" (Departments: visible to them
   *  too, since they manage their own; see canWriteOwnDepartment). */
  visible?: (admin: Admin) => boolean;
}[] = [
  { label: "Overview", href: "/admin" },
  { label: "Leadership & Administrations", href: "/admin/leadership" },
  { label: "Members", href: "/admin/members" },
  {
    label: "Departments",
    href: "/admin/departments",
    visible: (admin) => hasRole(admin, "admin") || admin.role === "department_admin",
  },
  {
    label: "Department Members",
    href: "/admin/department-members",
    visible: (admin) => hasRole(admin, "admin") || admin.role === "department_admin",
  },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Moot", href: "/admin/moot" },
  { label: "Research", href: "/admin/research" },
  { label: "CSR", href: "/admin/csr" },
  { label: "Events", href: "/admin/events" },
  { label: "Conferences", href: "/admin/conferences" },
  { label: "Publications", href: "/admin/publications" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Partners", href: "/admin/partners", minRole: "admin" },
  { label: "Newsletter", href: "/admin/newsletter", minRole: "admin" },
  { label: "Settings", href: "/admin/settings", minRole: "super_admin" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated requests before this
  // layout runs, but we still fetch the admin row here (not just the auth
  // user) because the sidebar needs role, and a defense-in-depth check
  // costs nothing.
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const visibleSections = NAV_SECTIONS.filter((s) =>
    s.visible ? s.visible(admin) : !s.minRole || hasRole(admin, s.minRole)
  );

  return (
    <div className="min-h-screen bg-off-white">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <AdminMobileNav items={visibleSections} />
            <Link
              href="/admin"
              className="flex min-w-0 items-center gap-2.5 truncate font-serif text-base text-navy-deep lg:text-lg"
            >
              <span className="relative h-7 w-7 flex-none overflow-hidden rounded-full ring-1 ring-navy-deep/20">
                <Image
                  src="/img/yas-logo-web.jpg"
                  alt=""
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
              YAS Admin
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-5">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate font-semibold text-ink">{admin.full_name}</div>
              <div className="text-xs capitalize text-ink-soft">
                {admin.role.replace("_", " ")}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-navy-deep hover:text-navy-deep lg:px-4"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-10 lg:py-10">
        <nav className="hidden lg:block">
          <ul className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
            {visibleSections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="block rounded-[2px] px-3.5 py-2.5 hover:bg-white hover:text-navy-deep"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
