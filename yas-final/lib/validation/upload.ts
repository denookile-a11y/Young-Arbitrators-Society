export type UploadBucket = "images" | "documents" | "videos";

const ALLOWED_TYPES: Record<UploadBucket, string[]> = {
  images: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  documents: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  ],
  videos: ["video/mp4"],
};

// Per the directive's media management section: sensible caps so a single
// upload can't silently exhaust storage or time out the browser.
const MAX_SIZE_BYTES: Record<UploadBucket, number> = {
  images: 8 * 1024 * 1024, // 8MB
  documents: 25 * 1024 * 1024, // 25MB
  videos: 200 * 1024 * 1024, // 200MB
};

export function validateFile(file: File, bucket: UploadBucket): string | null {
  if (!ALLOWED_TYPES[bucket].includes(file.type)) {
    return `File type "${file.type || "unknown"}" isn't allowed in this field. Accepted: ${ALLOWED_TYPES[bucket].join(", ")}`;
  }
  if (file.size > MAX_SIZE_BYTES[bucket]) {
    const maxMb = Math.round(MAX_SIZE_BYTES[bucket] / (1024 * 1024));
    return `File is too large (max ${maxMb}MB for this field).`;
  }
  return null;
}

export function acceptAttr(bucket: UploadBucket): string {
  return ALLOWED_TYPES[bucket].join(",");
}
