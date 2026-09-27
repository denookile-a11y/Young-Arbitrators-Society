import { createClient } from "@/lib/supabase/server";

/**
 * Generic list/get helpers for simple content tables (no special joins).
 * Modules with real relational needs (moot+documents, research+documents,
 * conferences+speakers) still get their own richer query file — see
 * lib/queries/departments.ts for the fully-typed single-table reference,
 * and lib/queries/moot.ts etc. for the joined versions.
 */
export async function listContent<T>(
  table: string,
  orderBy: { column: string; ascending?: boolean } = { column: "order_index", ascending: true }
): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderBy.column, { ascending: orderBy.ascending ?? true })
    .returns<T[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getContentById<T>(table: string, id: string): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle<T>();
  if (error) throw new Error(error.message);
  return data;
}

export async function getContentBySlug<T>(table: string, slug: string): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<T>();
  if (error) throw new Error(error.message);
  return data;
}
