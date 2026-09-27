"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function approveMemberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status: "published" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members");
}

export async function rejectMemberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members");
}

export async function deleteMemberAction(id: string) {
  await requireAdmin("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members");
}
