import type { ContentStatus } from "@/types/database";

const LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  archived: "Archived",
};

const CLASS: Record<ContentStatus, string> = {
  draft: "bg-hairline text-ink-soft",
  review: "bg-gold/20 text-navy-deep",
  published: "bg-navy-deep text-white",
  archived: "bg-ink-soft/15 text-ink-soft",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-block w-fit rounded-[2px] px-2.5 py-1 text-xs font-bold whitespace-nowrap ${CLASS[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
