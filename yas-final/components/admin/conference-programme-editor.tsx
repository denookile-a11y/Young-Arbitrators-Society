"use client";

import { useState, useTransition } from "react";
import type { ProgrammeItem } from "@/types/database";
import { saveConferenceProgrammeAction } from "@/lib/actions/conference-programme";

function emptySession(): ProgrammeItem {
  return { time: "", title: "", location: "" };
}

/**
 * A structured, reorderable list editor for the programme JSONB column.
 * Administrators never see or touch raw JSON — each session is a row with
 * plain Time / Title / Location fields, plus Up/Down/Remove controls.
 * Changes are held in local state and only written to Supabase when
 * "Save Programme" is pressed, so a mis-click doesn't silently corrupt
 * the saved schedule mid-edit.
 */
export function ConferenceProgrammeEditor({
  conferenceId,
  initialSessions,
}: {
  conferenceId: string;
  initialSessions: ProgrammeItem[];
}) {
  const [sessions, setSessions] = useState<ProgrammeItem[]>(
    initialSessions.length > 0 ? initialSessions : []
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSession(index: number, field: keyof ProgrammeItem, value: string) {
    setSessions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSaveState("idle");
  }

  function addSession() {
    setSessions((prev) => [...prev, emptySession()]);
    setSaveState("idle");
  }

  function removeSession(index: number) {
    setSessions((prev) => prev.filter((_, i) => i !== index));
    setSaveState("idle");
  }

  function moveSession(index: number, direction: -1 | 1) {
    setSessions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaveState("idle");
  }

  function validate(): boolean {
    const newErrors: Record<number, string> = {};
    sessions.forEach((s, i) => {
      if (!s.time.trim()) newErrors[i] = "Time is required";
      else if (!s.title.trim()) newErrors[i] = "Session title is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      setSaveState("error");
      setSaveError("Fix the highlighted sessions before saving.");
      return;
    }
    startTransition(async () => {
      const result = await saveConferenceProgrammeAction(conferenceId, sessions);
      if (result.error) {
        setSaveState("error");
        setSaveError(result.error);
      } else {
        setSaveState("saved");
        setSaveError(null);
      }
    });
  }

  return (
    <div>
      {sessions.length === 0 ? (
        <p className="mb-6 text-sm text-ink-soft">No sessions yet — add the first one below.</p>
      ) : (
        <div className="mb-6 space-y-3">
          {sessions.map((session, i) => (
            <div key={i} className="rounded-[2px] border border-hairline bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[110px_1fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-ink-soft">Time</label>
                  <input
                    value={session.time}
                    onChange={(e) => updateSession(i, "time", e.target.value)}
                    placeholder="09:00"
                    className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-navy-deep"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-ink-soft">Session Title</label>
                  <input
                    value={session.title}
                    onChange={(e) => updateSession(i, "title", e.target.value)}
                    placeholder="Opening Keynote"
                    className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-navy-deep"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-ink-soft">Location</label>
                  <input
                    value={session.location ?? ""}
                    onChange={(e) => updateSession(i, "location", e.target.value)}
                    placeholder="Main Auditorium"
                    className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-navy-deep"
                  />
                </div>
              </div>

              {errors[i] && <p className="mt-2 text-xs text-red-600">{errors[i]}</p>}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveSession(i, -1)}
                  disabled={i === 0}
                  aria-label="Move session up"
                  className="rounded-[2px] border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep disabled:opacity-30"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSession(i, 1)}
                  disabled={i === sessions.length - 1}
                  aria-label="Move session down"
                  className="rounded-[2px] border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep disabled:opacity-30"
                >
                  ↓ Down
                </button>
                <button
                  type="button"
                  onClick={() => removeSession(i)}
                  className="ml-auto rounded-[2px] border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addSession}
          className="rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep"
        >
          + Add Session
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || sessions.length === 0}
          className="rounded-[2px] bg-navy-deep px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-mid disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Programme"}
        </button>
        {saveState === "saved" && (
          <span className="text-xs font-semibold text-navy-deep">✓ Saved</span>
        )}
        {saveState === "error" && saveError && (
          <span className="text-xs font-semibold text-red-600">{saveError}</span>
        )}
      </div>
    </div>
  );
}
