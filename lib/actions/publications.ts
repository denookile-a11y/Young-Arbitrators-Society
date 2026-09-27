"use server";

import { runScopedCreate, runScopedUpdate } from "./scoped-content-actions";
import type { GenericFormState } from "./make-content-actions";
import { publicationSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || undefined,
    body: formData.get("body") || undefined,
    category: formData.get("category") || undefined,
    department_id: formData.get("department_id") || "",
    cover_image_url: formData.get("cover_image_url") || "",
    published_on: formData.get("published_on") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "publications",
  schema: publicationSchema,
  parseFormData: parseForm,
  listPath: "/admin/publications",
  publicPath: "/publications",
  getSlug: (data: { slug: string }) => data.slug,
  minRole: "editor" as const,
};

export async function createPublicationAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runScopedCreate(config, formData);
}

export async function updatePublicationAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runScopedUpdate(config, id, formData);
}
