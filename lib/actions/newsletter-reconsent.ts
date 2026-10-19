"use server";

import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/auth/require-admin";
import { getConsentSummary, requestLegacyReconsent, type ConsentSummary } from "@/lib/newsletter/service";
import {
  RECONSENT_DEFAULT_LIMIT,
  RECONSENT_LIMITS,
  type ReconsentActionState,
} from "@/lib/newsletter/reconsent-types";

const fail = (message: string): ReconsentActionState => ({ status: "error", message });

function parseLimit(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === "") return RECONSENT_DEFAULT_LIMIT;
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  return (RECONSENT_LIMITS as readonly number[]).includes(n) ? n : null;
}

/**
 * Operator workflow for LEGACY newsletter subscribers: ask them to confirm.
 *
 * Authorisation: SUPER ADMIN only (the highest role in lib/auth/current-admin.ts),
 * checked on the server before any service-role code runs. Hiding the button in
 * the UI is not relied upon.
 *
 * Two separate intents, one action:
 *  - "preview": a dry run. It reads counts and queues nothing. It is the default.
 *  - "execute": queues the standard double opt-in confirmation email for the next
 *    batch. It needs an explicit confirmation field, and `expectedTotal`, the
 *    legacy count the operator saw in their preview. If that count has changed
 *    (a double submit, another operator, new unsubscribes) nothing is sent and the
 *    operator is told to preview again, so a stale page cannot trigger a batch.
 *
 * It never confirms anyone, never contacts unsubscribed people, and only calls the
 * existing service, which queues through the outbox and respects the hourly
 * budget. Results are counts only; failures are reported generically.
 */
export async function legacyReconsentAction(
  _previous: ReconsentActionState,
  formData: FormData
): Promise<ReconsentActionState> {
  const denied = await checkAdmin("super_admin");
  if (denied) return fail(denied);

  const intent = formData.get("intent");
  if (intent !== "preview" && intent !== "execute") return fail("Unknown request.");
  const limit = parseLimit(formData.get("limit"));
  if (limit === null) return fail("Choose a valid batch size.");

  try {
    const batch = await requestLegacyReconsent({ execute: false, limit });
    if (batch.stoppedBy === "not_configured") {
      return fail("Email is not configured on this server (the service key and a real site address are required).");
    }
    if (batch.stoppedBy === "error") {
      return fail("Could not read the subscriber list. Check that the latest database migration has been applied.");
    }
    const before: ConsentSummary = await getConsentSummary();

    if (intent === "preview") {
      return { status: "preview", limit, eligibleInBatch: batch.eligible, summary: before };
    }

    // ---- execute: explicit, separate, and checked against what the operator previewed ----
    if (formData.get("confirm") !== "yes") {
      return fail("Tick the confirmation box to send confirmation requests.");
    }
    const expectedRaw = formData.get("expectedTotal");
    const expected = typeof expectedRaw === "string" && /^\d{1,7}$/.test(expectedRaw) ? Number(expectedRaw) : null;
    if (expected === null) return fail("Run a preview first.");
    if (before.legacyUnconfirmed !== expected) {
      return fail(
        `The list changed since your preview (it now shows ${before.legacyUnconfirmed} legacy subscribers). Nothing was sent. Preview again.`
      );
    }
    if (batch.eligible === 0) return fail("There are no legacy subscribers waiting for a confirmation request.");

    const result = await requestLegacyReconsent({ execute: true, limit });
    if (result.stoppedBy === "not_configured") return fail("Email is not configured on this server.");
    const after = await getConsentSummary();
    revalidatePath("/admin/newsletter");
    return {
      status: "executed",
      limit,
      processed: result.queued + result.skipped + result.failed,
      queued: result.queued,
      skipped: result.skipped,
      failed: result.failed,
      stoppedBy: result.stoppedBy,
      summary: after,
    };
  } catch (error) {
    // Server log only, message text only (never tokens: the service never puts any in an error).
    console.error("legacy re-consent action failed:", error instanceof Error ? error.message : "unknown error");
    return fail("Something went wrong. Check the subscriber list and email queue before trying again.");
  }
}
