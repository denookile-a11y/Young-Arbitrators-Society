import { createClient } from "@/lib/supabase/server";
import type { NewsletterSubscriber } from "@/types/database";
import { listPaginated, type PaginatedResult } from "@/lib/queries/paginated";

/** Paginated view for the admin table. */
export async function listNewsletterSubscribersPaginated(
  page: number
): Promise<PaginatedResult<NewsletterSubscriber>> {
  return listPaginated<NewsletterSubscriber>("newsletter_subscribers", {
    page,
    orderBy: { column: "subscribed_at", ascending: false },
  });
}

/**
 * Unbounded, for the CSV export only — a real export has to include every
 * active subscriber regardless of which page the admin happens to be
 * viewing, so this intentionally does NOT paginate. Still filters to
 * active (non-unsubscribed) rows in the database rather than fetching
 * everyone and filtering in JS.
 */
export async function listActiveSubscribersForExport(): Promise<NewsletterSubscriber[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .is("unsubscribed_at", null)
    .order("subscribed_at", { ascending: false })
    .returns<NewsletterSubscriber[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
