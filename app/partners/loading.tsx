import { SkeletonPageHero, SkeletonBar } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonPageHero />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <SkeletonBar className="mb-6 h-4 w-24" />
          <div className="flex flex-wrap items-center justify-between gap-10 border-y border-hairline py-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBar key={i} className="h-7 w-32" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
