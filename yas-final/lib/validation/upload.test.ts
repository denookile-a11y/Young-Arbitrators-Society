import { describe, it, expect } from "vitest";
import { validateFile, acceptAttr } from "./upload";

/**
 * File is a Web/DOM API. Vitest's node environment doesn't provide it by
 * default in older Node versions, but Node 20+ has a global File
 * constructor, so this constructs real File instances rather than mocking
 * the interface — closer to real behavior than a hand-rolled stub.
 */
function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("validateFile", () => {
  it("accepts an allowed image type under the size cap", () => {
    const file = makeFile("cover.jpg", "image/jpeg", 1024 * 1024); // 1MB
    expect(validateFile(file, "images")).toBeNull();
  });

  it("rejects a disallowed type for the images bucket", () => {
    const file = makeFile("cover.gif", "image/gif", 1024);
    expect(validateFile(file, "images")).not.toBeNull();
  });

  it("rejects an image over the 8MB cap", () => {
    const file = makeFile("cover.jpg", "image/jpeg", 9 * 1024 * 1024);
    expect(validateFile(file, "images")).toMatch(/too large/i);
  });

  it("accepts a PDF at exactly the documents cap boundary", () => {
    const file = makeFile("report.pdf", "application/pdf", 25 * 1024 * 1024);
    expect(validateFile(file, "documents")).toBeNull();
  });

  it("rejects a document one byte over the cap", () => {
    const file = makeFile("report.pdf", "application/pdf", 25 * 1024 * 1024 + 1);
    expect(validateFile(file, "documents")).not.toBeNull();
  });

  it("rejects a video that isn't mp4", () => {
    const file = makeFile("clip.mov", "video/quicktime", 1024);
    expect(validateFile(file, "videos")).not.toBeNull();
  });

  it("accepts an mp4 under the 200MB video cap", () => {
    const file = makeFile("clip.mp4", "video/mp4", 50 * 1024 * 1024);
    expect(validateFile(file, "videos")).toBeNull();
  });

  it("reports an unknown/empty MIME type in the error message rather than throwing", () => {
    const file = makeFile("mystery", "", 1024);
    const error = validateFile(file, "images");
    expect(error).not.toBeNull();
    expect(error).toMatch(/unknown/i);
  });
});

describe("acceptAttr", () => {
  it("returns a comma-joined list matching the allowed types per bucket", () => {
    expect(acceptAttr("images")).toContain("image/jpeg");
    expect(acceptAttr("documents")).toContain("application/pdf");
    expect(acceptAttr("videos")).toBe("video/mp4");
  });
});
