import Link from "next/link";
import type { ContentStatus } from "@/types/database";
import { StatusBadge } from "./status-badge";

export interface CmsRowAction {
  label: string;
  href?: string;
  formAction?: (formData: FormData) => void;
  variant?: "default" | "danger";
}

export function CmsTableRow({
  title,
  meta,
  status,
  editHref,
  previewHref,
  actions = [],
}: {
  title: string;
  meta?: string;
  status: ContentStatus;
  editHref: string;
  previewHref?: string;
  actions?: CmsRowAction[];
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-center gap-6 border-b border-hairline py-5">
      <StatusBadge status={status} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        {meta && <div className="text-xs text-ink-soft">{meta}</div>}
      </div>
      <div className="flex items-center gap-2">
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep"
          >
            Preview
          </a>
        )}
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className={`rounded-[2px] border px-3 py-2 text-xs font-semibold ${
                action.variant === "danger"
                  ? "border-red-200 text-red-600 hover:border-red-400"
                  : "border-hairline text-ink-soft hover:border-navy-deep hover:text-navy-deep"
              }`}
            >
              {action.label}
            </Link>
          ) : (
            <form key={action.label} action={action.formAction}>
              <button
                type="submit"
                className={`rounded-[2px] border px-3 py-2 text-xs font-semibold ${
                  action.variant === "danger"
                    ? "border-red-200 text-red-600 hover:border-red-400"
                    : "border-hairline text-ink-soft hover:border-navy-deep hover:text-navy-deep"
                }`}
              >
                {action.label}
              </button>
            </form>
          )
        )}
        <Link
          href={editHref}
          className="rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold text-navy-deep hover:border-navy-deep"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
