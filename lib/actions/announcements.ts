"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notifyAndDeliver } from "@/lib/announcements/notify";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { nairobiLocalToUtcIso } from "@/lib/time/nairobi";
import { runCreate, runUpdate, type GenericFormState } from "./make-content-actions";
import { announcementSchema } from "@/lib/validation/content";

function parseForm(formData: FormData, canNotify: boolean) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    category: formData.get("category") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    // Admins type Nairobi wall-clock time; the database stores the real instant.
    publish_at: nairobiLocalToUtcIso(formData.get("publish_at") as string | null),
    expires_at: nairobiLocalToUtcIso(formData.get("expires_at") as string | null),
    order_index: formData.get("order_index") || 0,
    department_id: formData.get("department_id") || "",
    // undefined (omitted from the write) when the caller may not change it, so
    // an editor saving an announcement cannot cancel an admin's opt-in.
    notify_subscribers: canNotify ? formData.get("notify_subscribers") === "on" : undefined,
  };
}

/** Everything an announcement can appear on, so a change shows up promptly. */
function revalidateAnnouncementSurfaces() {
  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/announcements/[slug]", "page");
  revalidatePath("/departments/[slug]", "page");
}

/**
 * Publication and notification are decoupled: the announcement is already
 * saved and visible by the time this runs, and the email fan-out happens
 * after the response (so a slow or failing provider can never block or undo
 * publication). It only does anything for rows an admin ticked "Email
 * subscribers" on, that are live, and that have not been notified yet.
 */
function afterSave() {
  revalidateAnnouncementSurfaces();
  after(() => notifyAndDeliver());
}

async function makeConfig(formData: FormData) {
  // Emailing subscribers is a bulk-mail decision: admin+ only (the database
  // trigger enforces the same rule, this gives a friendly message first).
  const canNotify = hasRole(await getCurrentAdmin(), "admin");
  const asked = formData.get("notify_subscribers") === "on";
  return {
    denied: asked && !canNotify,
    config: {
      table: "announcements",
      schema: announcementSchema,
      parseFormData: (fd: FormData) => parseForm(fd, canNotify),
      listPath: "/admin/announcements",
      publicPath: "/",
      getSlug: () => "",
      afterSave,
    },
  };
}

const DENIED = { error: "Only administrators can email subscribers. Untick that option to save." };

export async function createAnnouncementAction(
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  const { config, denied } = await makeConfig(formData);
  if (denied) return DENIED;
  return runCreate(config, formData);
}

export async function updateAnnouncementAction(
  id: string,
  _prev: GenericFormState,
  formData: FormData
): Promise<GenericFormState> {
  const { config, denied } = await makeConfig(formData);
  if (denied) return DENIED;
  return runUpdate(config, id, formData);
}
