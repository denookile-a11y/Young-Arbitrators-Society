"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, checkAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const gallerySchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  cover_image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: z.enum(["draft", "review", "published", "archived"]),
  featured: z.coerce.boolean().default(false),
  order_index: z.coerce.number().int().default(0),
});

export interface GalleryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}

function parseForm(formData: FormData) {
  return gallerySchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    cover_image_url: formData.get("cover_image_url") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  });
}

export async function createGalleryAction(
  _prev: GalleryFormState,
  formData: FormData
): Promise<GalleryFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data, error } = await supabase.from("galleries").insert(parsed.data).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  redirect(`/admin/gallery/${data.id}?toast=Gallery created — add photos below`);
}

export async function updateGalleryAction(
  id: string,
  _prev: GalleryFormState,
  formData: FormData
): Promise<GalleryFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("galleries").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  redirect("/admin/gallery?toast=Gallery updated");
}

export async function deleteGalleryAction(id: string) {
  await requireAdmin("editor");

  const supabase = await createClient();
  const { error } = await supabase.from("galleries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  redirect("/admin/gallery?toast=Gallery deleted");
}

// ---------- gallery items (photos/videos within a gallery) ----------

const galleryItemSchema = z.object({
  gallery_id: z.string().uuid(),
  kind: z.enum(["image", "video"]),
  file_url: z.string().url("Enter a valid file URL"),
  caption: z.string().optional(),
  order_index: z.coerce.number().int().default(0),
});

export interface GalleryItemFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function addGalleryItemAction(
  galleryId: string,
  _prev: GalleryItemFormState,
  formData: FormData
): Promise<GalleryItemFormState> {
  const authError = await checkAdmin("editor");
  if (authError) return { error: authError };

  const parsed = galleryItemSchema.safeParse({
    gallery_id: galleryId,
    kind: formData.get("kind"),
    file_url: formData.get("file_url"),
    caption: formData.get("caption") || undefined,
    order_index: formData.get("order_index") || 0,
  });
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") out[key] = issue.message;
    }
    return { fieldErrors: out };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath(`/admin/gallery/${galleryId}`);
  revalidatePath("/gallery");
  return {};
}

export async function deleteGalleryItemAction(itemId: string, galleryId: string) {
  await requireAdmin("editor");

  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/gallery/${galleryId}`);
  revalidatePath("/gallery");
}
