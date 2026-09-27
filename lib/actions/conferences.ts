"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { conferenceSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    theme: formData.get("theme") || undefined,
    description: formData.get("description") || undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || undefined,
    venue: formData.get("venue") || undefined,
    registration_url: formData.get("registration_url") || "",
    report_url: formData.get("report_url") || "",
    cover_image_url: formData.get("cover_image_url") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "conferences",
  schema: conferenceSchema,
  parseFormData: parseForm,
  listPath: "/admin/conferences",
  publicPath: "/conferences",
  getSlug: (data: { slug: string }) => data.slug,
};

export async function createConferenceAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updateConferenceAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
