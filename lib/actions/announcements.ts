"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { announcementSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    category: formData.get("category") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    publish_at: formData.get("publish_at") || undefined,
    expires_at: formData.get("expires_at") || undefined,
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "announcements",
  schema: announcementSchema,
  parseFormData: parseForm,
  listPath: "/admin/announcements",
  publicPath: "/",
  getSlug: () => "",
};

export async function createAnnouncementAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updateAnnouncementAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
