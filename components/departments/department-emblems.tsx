import type { EmblemKey } from "@/lib/department-identity";

/**
 * Line emblems for the department tiles. Inline SVG on a 24-unit grid using
 * currentColor, so each inherits its department's accent. Decorative: the
 * department name beside it carries the meaning (aria-hidden).
 */
const PATHS: Record<EmblemKey, React.ReactNode> = {
  // Scales of justice
  scales: (
    <>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path d="M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z" />
      <circle cx="12" cy="3.4" r="0.9" />
    </>
  ),
  // Open book
  book: (
    <>
      <path d="M12 6.5C9.8 5 6.8 4.6 3.5 5v13c3.3-.4 6.3 0 8.5 1.5 2.2-1.5 5.2-1.9 8.5-1.5V5c-3.3-.4-6.3 0-8.5 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Globe with network nodes
  network: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18" />
      <circle cx="17.5" cy="7" r="1" />
      <circle cx="7" cy="16.5" r="1" />
    </>
  ),
  // Megaphone / broadcast
  megaphone: (
    <>
      <path d="M3 10v4h3l8 4V6L6 10H3z" />
      <path d="M17 9a4 4 0 0 1 0 6M19.6 6.4a8 8 0 0 1 0 11.2" />
      <path d="M6 14l1.2 5h2.4L8.6 15.6" />
    </>
  ),
  // Group, with a growth arc
  group: (
    <>
      <circle cx="12" cy="8" r="3" />
      <circle cx="5.3" cy="10.3" r="2.1" />
      <circle cx="18.7" cy="10.3" r="2.1" />
      <path d="M6.6 19c0-3 2.4-5 5.4-5s5.4 2 5.4 5" />
      <path d="M1.6 17.4c.2-1.9 1.6-3.2 3.7-3.2M22.4 17.4c-.2-1.9-1.6-3.2-3.7-3.2" />
    </>
  ),
  // Quill
  quill: (
    <>
      <path d="M20.5 3.5C12.5 3.5 7.5 8.5 6.5 16.5L4 20.5" />
      <path d="M6.5 16.5c6.2 0 11-4 14-13M9.5 13.5h5" />
    </>
  ),
  // Mountain and sun: the outdoors
  mountain: (
    <>
      <path d="M2 20l7-12 4 7 2-3 7 8H2z" />
      <circle cx="17.5" cy="6" r="2" />
    </>
  ),
  // Institutional columns
  columns: (
    <>
      <path d="M3 9l9-5 9 5H3z" />
      <path d="M5.5 9.5v8.5M9.8 9.5v8.5M14.2 9.5v8.5M18.5 9.5v8.5M3 20.5h18" />
    </>
  ),
  // Two linked rings: collaboration
  rings: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  // Neutral seal (fallback)
  seal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l1.6 3.4 3.7.5-2.7 2.6.7 3.7L12 15.4l-3.3 1.8.7-3.7-2.7-2.6 3.7-.5L12 7z" />
    </>
  ),
};

export function DepartmentEmblem({ name, className }: { name: EmblemKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
