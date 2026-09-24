"use server";

import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { mootSchema } from "@/lib/validation/content";

function parseForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    theme: formData.get("theme") || undefined,
    description: formData.get("description") || undefined,
    problem_summary: formData.get("problem_summary") || undefined,
    year: formData.get("year"),
    registration_opens_at: formData.get("registration_opens_at") || undefined,
    competition_starts_at: formData.get("competition_starts_at") || undefined,
    winning_team: formData.get("winning_team") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    order_index: formData.get("order_index") || 0,
  };
}

const config = {
  table: "moots",
  schema: mootSchema,
  parseFormData: parseForm,
  listPath: "/admin/moot",
  publicPath: "/moot",
  getSlug: (data: { slug: string }) => data.slug,
};

export async function createMootAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runCreate(config, formData);
}

export async function updateMootAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  return runUpdate(config, id, formData);
}
