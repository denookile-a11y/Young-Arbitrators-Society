import Link from "next/link";

/**
 * Link-based pager: each page is a real URL (?page=N), so it's
 * server-rendered, shareable, and works with the browser back button —
 * no client-side page state to keep in sync with the URL. basePath should
 * include any existing query params the page wants to preserve (e.g.
 * `/admin/research?status=draft`); this component appends/overwrites
 * `page` on top of that.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number) {
    const url = new URL(basePath, "http://placeholder");
    url.searchParams.set("page", String(targetPage));
    return url.pathname + "?" + url.searchParams.toString();
  }

  // Compact page-number list: always show first, last, current, and one
  // neighbour on each side; collapse the rest into an ellipsis rather than
  // rendering every page number for a 40-page list.
  const pageNumbers = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const visiblePages = [...pageNumbers]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center gap-2">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold ${
          page === 1
            ? "pointer-events-none opacity-30"
            : "text-ink-soft hover:border-navy-deep hover:text-navy-deep"
        }`}
      >
        ← Previous
      </Link>

      {visiblePages.map((p, i) => {
        const prev = visiblePages[i - 1];
        const showEllipsis = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-2">
            {showEllipsis && <span className="px-1 text-xs text-ink-soft">…</span>}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-[2px] border text-xs font-semibold ${
                p === page
                  ? "border-navy-deep bg-navy-deep text-white"
                  : "border-hairline text-ink-soft hover:border-navy-deep hover:text-navy-deep"
              }`}
            >
              {p}
            </Link>
          </span>
        );
      })}

      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold ${
          page === totalPages
            ? "pointer-events-none opacity-30"
            : "text-ink-soft hover:border-navy-deep hover:text-navy-deep"
        }`}
      >
        Next →
      </Link>
    </nav>
  );
}
