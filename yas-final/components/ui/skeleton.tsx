/**
 * Skeleton primitives that mirror the real layouts they stand in for —
 * hairline-bordered rows and grid cells in the YAS palette, not generic
 * spinners. Each variant matches the shape of the content it replaces so
 * the page doesn't visibly reflow when data arrives.
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[2px] bg-hairline ${className}`} />;
}

/** Mirrors the hairline-divided list rows used by Events/Publications/CMS tables. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="border-t border-hairline">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[120px_1fr_auto] items-center gap-6 border-b border-hairline py-5">
          <SkeletonBar className="h-4 w-20" />
          <div className="space-y-2">
            <SkeletonBar className="h-4 w-2/3" />
            <SkeletonBar className="h-3 w-1/3" />
          </div>
          <SkeletonBar className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the bordered card grids used by Research/Conferences/CSR/Gallery. */
export function SkeletonCards({ cards = 6, columns = 3 }: { cards?: number; columns?: number }) {
  const colClass = columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 gap-px border border-hairline bg-hairline ${colClass}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 bg-white p-8">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-5 w-3/4" />
          <SkeletonBar className="h-3 w-full" />
          <SkeletonBar className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the navy PageHero on public inner pages. */
export function SkeletonPageHero() {
  return (
    <section className="bg-gradient-to-br from-navy-deep via-[#0d2148] to-navy-mid px-6 pb-14 pt-[180px] md:px-10">
      <div className="mx-auto max-w-[1240px] space-y-5">
        <div className="h-3 w-24 animate-pulse rounded-[2px] bg-white/20" />
        <div className="h-12 w-2/3 animate-pulse rounded-[2px] bg-white/20" />
        <div className="h-4 w-1/2 animate-pulse rounded-[2px] bg-white/10" />
      </div>
    </section>
  );
}

/** Admin page heading skeleton. */
export function SkeletonCmsHeader() {
  return (
    <div className="mb-8 space-y-3">
      <SkeletonBar className="h-3 w-20" />
      <SkeletonBar className="h-8 w-64" />
    </div>
  );
}
