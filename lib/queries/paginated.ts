import { createClient } from "@/lib/supabase/server";

export const DEFAULT_PAGE_SIZE = 20;

export interface PaginatedResult<T> {
  rows: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface EqFilter {
  column: string;
  value: string | number | boolean;
}

/**
 * Real server-side pagination via Supabase's .range() + exact count — the
 * database only returns the rows for the requested page, it never fetches
 * every row and slices in the browser. Used by every admin/public list
 * that could grow unbounded (Research, Publications, Moot, Events,
 * Conferences, CSR, Gallery, Members, Newsletter, Announcements).
 *
 * `eqFilters` covers the common case (status='published', category='X').
 * For anything more complex (date ranges, text search), call the
 * Supabase client directly in that module's own query file — this helper
 * intentionally stays simple rather than becoming a leaky query-builder
 * abstraction.
 */
export async function listPaginated<T>(
  table: string,
  options: {
    page?: number;
    pageSize?: number;
    orderBy?: { column: string; ascending?: boolean };
    eqFilters?: EqFilter[];
  } = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase.from(table).select("*", { count: "exact" });

  for (const filter of options.eqFilters ?? []) {
    query = query.eq(filter.column, filter.value);
  }

  const orderBy = options.orderBy ?? { column: "order_index", ascending: true };
  query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });

  const { data, count, error } = await query.range(from, to).returns<T[]>();
  if (error) throw new Error(error.message);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return { rows: data ?? [], page, pageSize, totalCount, totalPages };
}
