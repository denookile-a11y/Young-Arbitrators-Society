import { createClient } from "@/lib/supabase/server";
import type { SiteSetting, Admin } from "@/types/database";

export async function listSiteSettings(): Promise<SiteSetting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .order("key", { ascending: true })
    .returns<SiteSetting[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAdmins(): Promise<Admin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Admin[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
