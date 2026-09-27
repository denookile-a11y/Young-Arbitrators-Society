import { SkeletonPageHero, SkeletonBar, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonPageHero />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-[70px] md:grid-cols-[0.9fr_1fr]">
          <SkeletonBar className="h-20 w-full" />
          <div className="space-y-4">
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-5/6" />
            <SkeletonBar className="h-4 w-4/6" />
          </div>
        </div>
      </section>
      <section className="bg-off-white px-6 py-14 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <SkeletonBar className="mb-12 h-8 w-64" />
          <SkeletonRows rows={3} />
        </div>
      </section>
    </>
  );
}
