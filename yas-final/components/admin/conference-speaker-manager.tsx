"use client";

import { useActionState, useState } from "react";
import type { ConferenceSpeaker } from "@/types/database";
import { addConferenceSpeakerAction, deleteConferenceSpeakerAction, type SpeakerFormState } from "@/lib/actions/conference-speakers";
import { createClient } from "@/lib/supabase/client";
import { validateFile } from "@/lib/validation/upload";

const initialState: SpeakerFormState = {};

export function ConferenceSpeakerManager({
  conferenceId,
  speakers,
}: {
  conferenceId: string;
  speakers: ConferenceSpeaker[];
}) {
  const boundAdd = addConferenceSpeakerAction.bind(null, conferenceId);
  const [state, formAction, isPending] = useActionState(boundAdd, initialState);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    const validationError = validateFile(file, "images");
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: false });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <div className="mb-10 border-t border-hairline">
        {speakers.length === 0 ? (
          <p className="py-8 text-sm text-ink-soft">No speakers added yet.</p>
        ) : (
          speakers.map((speaker) => (
            <div key={speaker.id} className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-hairline py-4">
              <div>
                <div className="text-sm font-semibold text-ink">{speaker.display_name}</div>
                <div className="text-xs text-ink-soft">
                  {[speaker.role_title, speaker.organisation].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteConferenceSpeakerAction(speaker.id, conferenceId)}
                className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <h3 className="mb-4 text-sm font-bold text-navy-deep">Add a speaker</h3>
      <form
        action={(formData) => {
          formData.set("photo_url", photoUrl);
          formAction(formData);
          setPhotoUrl("");
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Name</label>
            <input name="display_name" placeholder="Full name" className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-deep" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Role Title</label>
            <input name="role_title" placeholder="Senior Counsel" className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-deep" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Organisation</label>
            <input name="organisation" placeholder="Chartered Institute of Arbitrators" className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-deep" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">Photo</label>
          {photoUrl && (
            <div className="mb-2 flex items-center gap-3 rounded-[2px] border border-hairline bg-off-white px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{photoUrl}</span>
              <button type="button" onClick={() => setPhotoUrl("")} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
              id="speaker-photo-file"
            />
            <label htmlFor="speaker-photo-file" className="cursor-pointer rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep">
              {uploading ? "Uploading…" : "Choose photo"}
            </label>
            <span className="text-xs text-ink-soft">or paste a URL below</span>
          </div>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-deep"
          />
          {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending || uploading}
          className="w-fit rounded-[2px] bg-navy-deep px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-mid disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add Speaker"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-xs text-red-600">{state.error}</p>}
      {state.fieldErrors?.display_name && <p className="mt-3 text-xs text-red-600">{state.fieldErrors.display_name}</p>}
    </div>
  );
}
