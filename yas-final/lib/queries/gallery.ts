import { createClient } from "@/lib/supabase/server";
import type { Gallery, GalleryItem } from "@/types/database";

export async function getGallery(id: string): Promise<Gallery | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("id", id)
    .maybeSingle<Gallery>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listGalleryItems(galleryId: string): Promise<GalleryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("order_index", { ascending: true })
    .returns<GalleryItem[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
