import { SkeletonPageHero, SkeletonCards } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonPageHero />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <SkeletonCards cards={6} columns={3} />
        </div>
      </section>
    </>
  );
}
