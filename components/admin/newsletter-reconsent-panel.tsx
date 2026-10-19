"use client";

import { useActionState, useState } from "react";
import { legacyReconsentAction } from "@/lib/actions/newsletter-reconsent";
import {
  RECONSENT_DEFAULT_LIMIT,
  RECONSENT_INITIAL_STATE,
  RECONSENT_LIMITS,
  type ReconsentActionState,
} from "@/lib/newsletter/reconsent-types";

const btn = "rounded-[2px] px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const outline = `${btn} border border-hairline text-navy-deep hover:border-navy-deep`;
const solid = `${btn} bg-navy-deep text-white hover:bg-navy-mid`;

function Counts({ s }: { s: Extract<ReconsentActionState, { summary: unknown }>["summary"] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      <div><dt className="text-xs text-ink-soft">Legacy, not yet asked</dt><dd className="font-semibold">{s.legacyUnconfirmed}</dd></div>
      <div><dt className="text-xs text-ink-soft">Asked, awaiting confirmation</dt><dd className="font-semibold">{s.pendingAwaitingConfirmation}</dd></div>
      <div><dt className="text-xs text-ink-soft">Confirmed</dt><dd className="font-semibold">{s.confirmed}</dd></div>
      <div><dt className="text-xs text-ink-soft">Unsubscribed (never contacted)</dt><dd className="font-semibold">{s.unsubscribed}</dd></div>
    </dl>
  );
}

/**
 * Operator panel for the legacy re-consent workflow. Nothing here runs on load,
 * refresh or navigation: every request is a deliberate button press that posts
 * to a server action which re-checks the role. The Execute control only exists
 * after a successful preview, and stays disabled until the box is ticked.
 */
export function NewsletterReconsentPanel() {
  const [state, formAction, pending] = useActionState(legacyReconsentAction, RECONSENT_INITIAL_STATE);
  const [limit, setLimit] = useState<number>(RECONSENT_DEFAULT_LIMIT);
  const [ack, setAck] = useState(false);

  return (
    <section aria-labelledby="reconsent-title" className="mb-10 border border-hairline p-5 sm:p-6">
      <h2 id="reconsent-title" className="font-serif text-xl text-navy-deep">Legacy subscriber re-consent</h2>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Subscribers imported before consent was recorded are <strong>pending</strong> and receive nothing. This asks them to confirm by
        email. It does <strong>not</strong> confirm anyone: each person stays pending until they click their own confirmation link.
        Unsubscribed people are never contacted.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="intent" value="preview" />
        <label className="text-xs font-semibold text-ink-soft">
          Batch size
          <select
            name="limit"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setAck(false); }}
            className="ml-2 rounded-[2px] border border-hairline bg-white px-2 py-2 text-xs text-ink"
          >
            {RECONSENT_LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending} className={outline}>{pending ? "Working…" : "Preview (sends no email)"}</button>
      </form>

      <div aria-live="polite" className="mt-5">
        {state.status === "error" && (
          <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        {state.status === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-ink">
              <strong>Preview only. No email has been sent.</strong> The next batch would ask{" "}
              <strong>{state.eligibleInBatch}</strong> legacy subscriber{state.eligibleInBatch === 1 ? "" : "s"} to confirm (batch size {state.limit}).
            </p>
            <Counts s={state.summary} />

            {state.eligibleInBatch > 0 && (
              <form action={formAction} key={`${state.summary.legacyUnconfirmed}-${state.limit}`} className="space-y-3 border-t border-hairline pt-4">
                <input type="hidden" name="intent" value="execute" />
                <input type="hidden" name="limit" value={state.limit} />
                <input type="hidden" name="expectedTotal" value={state.summary.legacyUnconfirmed} />
                <p className="text-sm text-ink">
                  Pressing <em>Send confirmation requests</em> will queue a confirmation-request email for these {state.eligibleInBatch} people
                  (sent by the email worker when email delivery is configured). They remain pending until they confirm.
                </p>
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" name="confirm" value="yes" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
                  <span>I understand this queues real confirmation-request emails and cannot be undone.</span>
                </label>
                <button type="submit" disabled={!ack || pending} className={solid}>
                  {pending ? "Working…" : `Send confirmation requests (${state.eligibleInBatch})`}
                </button>
              </form>
            )}
          </div>
        )}

        {state.status === "executed" && (
          <div className="space-y-3">
            <p className="text-sm text-ink"><strong>Batch complete.</strong> These people were asked to confirm; none are confirmed yet.</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-ink-soft">Processed</dt><dd className="font-semibold">{state.processed}</dd></div>
              <div><dt className="text-xs text-ink-soft">Queued</dt><dd className="font-semibold">{state.queued}</dd></div>
              <div><dt className="text-xs text-ink-soft">Skipped (no longer eligible)</dt><dd className="font-semibold">{state.skipped}</dd></div>
              <div><dt className="text-xs text-ink-soft">Failed (safe to retry)</dt><dd className="font-semibold">{state.failed}</dd></div>
            </dl>
            {state.stoppedBy === "budget" && <p className="text-sm text-ink-soft">Stopped at the hourly email limit. Run another preview later to continue.</p>}
            {state.stoppedBy === "error" && <p className="text-sm text-red-700">Stopped after a failure. Failed addresses were left eligible; preview again to retry.</p>}
            {state.stoppedBy === "limit" && <p className="text-sm text-ink-soft">More legacy subscribers remain. Preview again for the next batch.</p>}
            <Counts s={state.summary} />
          </div>
        )}
      </div>
    </section>
  );
}
