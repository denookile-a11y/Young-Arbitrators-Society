"use client";

import { useActionState, useState } from "react";
import type { GalleryItem } from "@/types/database";
import { addGalleryItemAction, deleteGalleryItemAction, type GalleryItemFormState } from "@/lib/actions/gallery";
import { createClient } from "@/lib/supabase/client";
import { validateFile } from "@/lib/validation/upload";

const initialState: GalleryItemFormState = {};

export function GalleryItemManager({
  galleryId,
  items,
}: {
  galleryId: string;
  items: GalleryItem[];
}) {
  const boundAdd = addGalleryItemAction.bind(null, galleryId);
  const [state, formAction, isPending] = useActionState(boundAdd, initialState);
  const [fileUrl, setFileUrl] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    const bucket = kind === "video" ? "videos" : "images";
    const validationError = validateFile(file, bucket);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setFileUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <div className="mb-10 border-t border-hairline">
        {items.length === 0 ? (
          <p className="py-8 text-sm text-ink-soft">No photos or videos added yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-6 border-b border-hairline py-4">
              <span className="text-xs font-extrabold tracking-wide text-gold uppercase">{item.kind}</span>
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{item.file_url}</div>
                {item.caption && <div className="text-xs text-ink-soft">{item.caption}</div>}
              </div>
              <button
                type="button"
                onClick={() => deleteGalleryItemAction(item.id, galleryId)}
                className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <h3 className="mb-4 text-sm font-bold text-navy-deep">Add a photo or video</h3>
      <form
        action={(formData) => {
          formData.set("file_url", fileUrl);
          formAction(formData);
          setFileUrl("");
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[100px_1fr]">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Type</label>
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "image" | "video")}
              className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2.5 text-sm"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-soft">Caption</label>
            <input
              name="caption"
              placeholder="Optional"
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
              accept={kind === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
              id="gallery-item-file"
            />
            <label htmlFor="gallery-item-file" className="cursor-pointer rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep">
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
          {isPending ? "Adding…" : "Add to Gallery"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-xs text-red-600">{state.error}</p>}
      {state.fieldErrors?.file_url && <p className="mt-3 text-xs text-red-600">{state.fieldErrors.file_url}</p>}
    </div>
  );
}
