"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateFile, acceptAttr, type UploadBucket } from "@/lib/validation/upload";

/**
 * Uploads a file directly from the browser to Supabase Storage using the
 * authenticated admin's session (the browser client, not a service-role
 * key) — the "editors can upload" Storage policies in
 * supabase/migrations/004 are what actually authorize this. On success,
 * writes the resulting public URL into a hidden input named `name`, so
 * this drops into any existing form exactly where a plain URL text field
 * used to be — the server action on the other end still just reads
 * formData.get(name) and sees a URL string, unchanged.
 */
export function FileUploadField({
  name,
  label,
  bucket,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  bucket: UploadBucket;
  defaultValue?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const validationError = validateFile(file, bucket);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    setStatus("uploading");

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    // Supabase's JS client doesn't expose upload progress events directly
    // for the standard upload() call, so this shows an indeterminate
    // "uploading" state rather than fabricating a percentage that isn't
    // tied to real bytes transferred.
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      setError(uploadError.message);
      setStatus("error");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(publicUrlData.publicUrl);
    setStatus("idle");
  }

  return (
    <div className="mb-6">
      <label className="mb-2 block text-xs font-bold text-ink-soft">{label}</label>

      <input type="hidden" name={name} value={url} />

      {url && (
        <div className="mb-2.5 flex items-center gap-3 rounded-[2px] border border-hairline bg-off-white px-3 py-2.5">
          {bucket === "images" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-10 w-10 rounded-[2px] object-cover" />
          ) : (
            <span className="text-lg">📄</span>
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{url}</span>
          <button
            type="button"
            onClick={() => setUrl("")}
            className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr(bucket)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
          id={`file-${name}`}
        />
        <label
          htmlFor={`file-${name}`}
          className="cursor-pointer rounded-[2px] border border-hairline px-4 py-2.5 text-xs font-semibold text-navy-deep hover:border-navy-deep"
        >
          {status === "uploading" ? "Uploading…" : url ? "Replace file" : "Choose file"}
        </label>
        <span className="text-xs text-ink-soft">or paste a URL below</span>
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="mt-2 w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-navy-deep"
      />

      {hint && !error && <p className="mt-1.5 text-xs text-ink-soft/70">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
