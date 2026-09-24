"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { partnerSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    logo_url: formData.get("logo_url") || "",
    website_url: formData.get("website_url") || "",
    tier: formData.get("tier") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "partners",
  schema: partnerSchema,
  parseFormData: parseForm,
  listPath: "/admin/partners",
  publicPath: "/partners",
  getSlug: (data: { slug: string }) => data.slug,
};

export async function createPartnerAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updatePartnerAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
