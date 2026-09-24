import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPendingMembers, listOtherMembersPaginated } from "@/lib/queries/members";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { approveMemberAction, rejectMemberAction, deleteMemberAction } from "@/lib/actions/members";

export default async function MembersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const pending = configured ? await listPendingMembers() : [];
  const othersResult = configured
    ? await listOtherMembersPaginated(page)
    : { rows: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
  const others = othersResult.rows;
  const hasAnyMembers = pending.length > 0 || othersResult.totalCount > 0;

  return (
    <div>
      <CmsListHeader eyebrow="Membership" title="Members" />

      <CmsConnectionGate configured={configured}>
        {!hasAnyMembers ? (
          <CmsEmptyState
            title="No membership applications yet"
            description="Submissions from the public Join page will appear here for review."
          />
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <span className="mb-4 block text-xs font-bold text-gold">
                  Pending Review ({pending.length})
                </span>
                <div className="mb-12 border-t border-hairline">
                  {pending.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-hairline py-5">
                      <div>
                        <div className="text-sm font-semibold text-ink">{m.full_name}</div>
                        <div className="text-xs text-ink-soft">
                          {m.email}
                          {m.year_of_study ? ` · ${m.year_of_study}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <form action={async () => { "use server"; await approveMemberAction(m.id); }}>
                          <button type="submit" className="rounded-[2px] bg-navy-deep px-4 py-2 text-xs font-bold text-white hover:bg-navy-mid">
                            Approve
                          </button>
                        </form>
                        <form action={async () => { "use server"; await rejectMemberAction(m.id); }}>
                          <button type="submit" className="rounded-[2px] border border-hairline px-4 py-2 text-xs font-semibold text-ink-soft hover:border-navy-deep">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {others.length > 0 && (
              <>
                <span className="mb-4 block text-xs font-bold text-gold">
                  All Members ({othersResult.totalCount})
                </span>
                <div className="border-t border-hairline">
                  {others.map((m) => (
                    <div key={m.id} className="grid grid-cols-[120px_1fr_auto] items-center gap-6 border-b border-hairline py-5">
                      <StatusBadge status={m.status} />
                      <div>
                        <div className="text-sm font-semibold text-ink">{m.full_name}</div>
                        <div className="text-xs text-ink-soft">{m.email}</div>
                      </div>
                      <form action={async () => { "use server"; await deleteMemberAction(m.id); }}>
                        <button type="submit" className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400">
                          Delete
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <Pagination page={othersResult.page} totalPages={othersResult.totalPages} basePath="/admin/members" />
              </>
            )}
          </>
        )}
      </CmsConnectionGate>
    </div>
  );
}
