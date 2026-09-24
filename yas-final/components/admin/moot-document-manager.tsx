"use client";

import { useActionState, useState } from "react";
import type { MootDocument } from "@/types/database";
import { addMootDocumentAction, deleteMootDocumentAction, type MootDocumentFormState } from "@/lib/actions/moot-documents";
import { createClient } from "@/lib/supabase/client";
import { validateFile } from "@/lib/validation/upload";

const initialState: MootDocumentFormState = {};

const KIND_OPTIONS = [
  { label: "Problem", value: "problem" },
  { label: "Procedural Order", value: "procedural_order" },
  { label: "Authorities", value: "authorities" },
  { label: "Memorial", value: "memorial" },
  { label: "Schedule", value: "schedule" },
  { label: "Results", value: "results" },
  { label: "Report", value: "report" },
  { label: "Other", value: "other" },
];

export function MootDocumentManager({
  mootId,
  documents,
}: {
  mootId: string;
  documents: MootDocument[];
}) {
  const boundAdd = addMootDocumentAction.bind(null, mootId);
  const [state, formAction, isPending] = useActionState(boundAdd, initialState);
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    const validationError = validateFile(file, "documents");
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    setFileUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <div className="mb-10 border-t border-hairline">
        {documents.length === 0 ? (
          <p className="py-8 text-sm text-ink-soft">No documents added yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="grid grid-cols-[140px_1fr_auto] items-center gap-6 border-b border-hairline py-4">
              <span className="text-xs font-extrabold tracking-wide text-gold">
                {doc.kind.replace("_", " ")}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{doc.title}</div>
                <div className="truncate text-xs text-ink-soft">{doc.file_url}</div>
              </div>
              <button
                type="button"
                onClick={() => deleteMootDocumentAction(doc.id, mootId)}
                className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <h3 className="mb-4 text-sm font-bold text-navy-deep">Add a document</h3>
      <form
        action={(formData) => {
          formData.set("file_url", fileUrl);
          formAction(formData);
          setFileUrl("");
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Type</label>
            <select name="kind" defaultValue="other" className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm">
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Title</label>
            <input
              name="title"
              placeholder="Problem Statement"
              className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-deep"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">File</label>
          {fileUrl && (
            <div className="mb-2 flex items-center gap-3 rounded-[2px] border border-hairline bg-off-white px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{fileUrl}</span>
              <button type="button" onClick={() => setFileUrl("")} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
              id="moot-doc-file"
            />
            <label htmlFor="moot-doc-file" className="cursor-pointer rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep">
              {uploading ? "Uploading…" : "Choose file"}
            </label>
            <span className="text-xs text-ink-soft">or paste a URL below</span>
          </div>
          <input
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-deep"
          />
          {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending || uploading || !fileUrl}
          className="rounded-[2px] bg-navy-deep px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-mid disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add Document"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-xs text-red-600">{state.error}</p>}
      {state.fieldErrors?.title && <p className="mt-3 text-xs text-red-600">{state.fieldErrors.title}</p>}
    </div>
  );
}
