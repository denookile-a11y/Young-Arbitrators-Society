import { z } from "zod";
import { getPublicContactSettings } from "@/lib/queries/public-settings";

const emailSchema = z.string().trim().max(320).email();

/**
 * Where contact-form mail goes. Never visitor-controlled.
 *   1. CONTACT_TO_EMAIL (server env) — an operator override, if set.
 *   2. The admin-managed "Contact Email" site setting.
 * Returns null if neither is a valid address.
 */
export async function resolveContactRecipient(env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const fromEnv = emailSchema.safeParse(env.CONTACT_TO_EMAIL ?? "");
  if (fromEnv.success) return fromEnv.data;
  const settings = await getPublicContactSettings();
  const fromSettings = emailSchema.safeParse(settings.contactEmail);
  return fromSettings.success ? fromSettings.data : null;
}
