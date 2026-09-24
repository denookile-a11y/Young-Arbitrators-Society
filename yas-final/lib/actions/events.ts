"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { eventSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || undefined,
    venue: formData.get("venue") || undefined,
    registration_url: formData.get("registration_url") || "",
    cover_image_url: formData.get("cover_image_url") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "events",
  schema: eventSchema,
  parseFormData: parseForm,
  listPath: "/admin/events",
  publicPath: "/events",
  getSlug: (data: { slug: string }) => data.slug,
};

export async function createEventAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updateEventAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
