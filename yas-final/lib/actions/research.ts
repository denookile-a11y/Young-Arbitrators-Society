"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { researchSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    abstract: formData.get("abstract") || undefined,
    authors: formData.get("authors") || "",
    category: formData.get("category") || undefined,
    topic: formData.get("topic") || undefined,
    tags: formData.get("tags") || undefined,
    pdf_url: formData.get("pdf_url") || "",
    cover_image_url: formData.get("cover_image_url") || "",
    published_on: formData.get("published_on") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "research",
  schema: researchSchema,
  parseFormData: parseForm,
  listPath: "/admin/research",
  publicPath: "/research",
  getSlug: (data: { slug: string }) => data.slug,
};

export async function createResearchAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updateResearchAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
