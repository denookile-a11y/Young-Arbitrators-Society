import { SkeletonCmsHeader, SkeletonRows } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div>
      <SkeletonCmsHeader />
      <SkeletonRows rows={8} />
    </div>
  );
}
