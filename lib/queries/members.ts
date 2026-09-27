import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/types/database";
import type { PaginatedResult } from "@/lib/queries/paginated";

// Pending review is a work queue an admin needs to see in full to act on,
// not a browsable archive — paginating it would hide applications needing
// a decision on page 2. Capped at 200 as a defensive limit so a burst of
// spam signups can't return an unbounded result; in practice this queue
// should stay small since it's cleared by approve/reject actions.
const PENDING_QUEUE_CAP = 200;

export async function listPendingMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("status", "review")
    .order("joined_at", { ascending: false })
    .limit(PENDING_QUEUE_CAP)
    .returns<Member[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Real server-side pagination for the approved/rejected member archive. */
export async function listOtherMembersPaginated(page: number): Promise<PaginatedResult<Member>> {
  const supabase = await createClient();
  const query = supabase
    .from("members")
    .select("*", { count: "exact" })
    .neq("status", "review")
    .order("joined_at", { ascending: false });

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.range(from, to).returns<Member[]>();
  if (error) throw new Error(error.message);

  const totalCount = count ?? 0;
  return {
    rows: data ?? [],
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
