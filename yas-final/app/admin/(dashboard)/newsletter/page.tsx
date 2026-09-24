import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listNewsletterSubscribersPaginated, listActiveSubscribersForExport } from "@/lib/queries/newsletter";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { Pagination } from "@/components/ui/pagination";
import {
  unsubscribeSubscriberAction,
  resubscribeSubscriberAction,
  deleteSubscriberAction,
} from "@/lib/actions/newsletter";

export default async function NewsletterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const result = configured
    ? await listNewsletterSubscribersPaginated(page)
    : { rows: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
  const subscribers = result.rows;

  // The CSV export is built from a separate, unbounded, database-filtered
  // query (not the current page's rows) so downloading it always includes
  // every active subscriber regardless of which page is on screen.
  const exportRows = configured ? await listActiveSubscribersForExport() : [];
  const csv =
    "email,subscribed_at,source\n" +
    exportRows.map((s) => `${s.email},${s.subscribed_at},${s.source ?? ""}`).join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div>
      <CmsListHeader eyebrow="Growth" title="Newsletter Subscribers" />

      <CmsConnectionGate configured={configured}>
        {result.totalCount === 0 ? (
          <CmsEmptyState
            title="No subscribers yet"
            description="Subscriptions from the homepage newsletter form will appear here."
          />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-ink-soft">
                {result.totalCount} subscriber{result.totalCount === 1 ? "" : "s"}
              </span>
              <a
                href={csvHref}
                download="yas-newsletter-subscribers.csv"
                className="rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep"
              >
                Export CSV ({exportRows.length} active)
              </a>
            </div>
            <div className="border-t border-hairline">
              {subscribers.map((sub) => (
                <div key={sub.id} className="grid grid-cols-[1fr_160px_100px_auto] items-center gap-6 border-b border-hairline py-4">
                  <span className="text-sm font-semibold text-ink">{sub.email}</span>
                  <span className="text-xs text-ink-soft">
                    {new Date(sub.subscribed_at).toLocaleDateString()}
                  </span>
                  <span className={`text-xs font-semibold ${sub.unsubscribed_at ? "text-red-600" : "text-navy-deep"}`}>
                    {sub.unsubscribed_at ? "Unsubscribed" : "Active"}
                  </span>
                  <div className="flex gap-2">
                    {sub.unsubscribed_at ? (
                      <form
                        action={async () => {
                          "use server";
                          await resubscribeSubscriberAction(sub.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold text-navy-deep hover:border-navy-deep"
                        >
                          Re-subscribe
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await unsubscribeSubscriberAction(sub.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-[2px] border border-hairline px-3 py-2 text-xs font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep"
                        >
                          Unsubscribe
                        </button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await deleteSubscriberAction(sub.id);
                      }}
                    >
                      <button
                        type="submit"
                        title="Permanently erase this record (data-protection requests only)"
                        className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/newsletter" />
          </>
        )}
      </CmsConnectionGate>
    </div>
  );
}
