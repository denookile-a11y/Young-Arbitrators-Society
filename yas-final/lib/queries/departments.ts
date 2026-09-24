import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/types/database";

export async function listDepartments(): Promise<Department[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("order_index", { ascending: true })
    .returns<Department[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDepartment(id: string): Promise<Department | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("id", id)
    .maybeSingle<Department>();
  if (error) throw new Error(error.message);
  return data;
}

export async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Department>();
  if (error) throw new Error(error.message);
  return data;
}
