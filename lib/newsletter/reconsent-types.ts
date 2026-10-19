import type { ConsentSummary } from "./service";

/** Batch sizes an operator may choose. Anything else is rejected server-side. */
export const RECONSENT_LIMITS = [10, 25, 50, 100] as const;
export const RECONSENT_DEFAULT_LIMIT = 50;

/**
 * What the admin UI is allowed to see. Counts only: no addresses, tokens, token
 * hashes, links, provider responses or raw error text ever appear here.
 */
export type ReconsentActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "preview";
      limit: number;
      /** Legacy subscribers in the next batch (at most `limit`). */
      eligibleInBatch: number;
      summary: ConsentSummary;
    }
  | {
      status: "executed";
      limit: number;
      processed: number;
      queued: number;
      skipped: number;
      failed: number;
      stoppedBy: "none" | "limit" | "budget" | "error";
      summary: ConsentSummary;
    };

export const RECONSENT_INITIAL_STATE: ReconsentActionState = { status: "idle" };
