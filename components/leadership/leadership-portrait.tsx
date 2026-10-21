"use client";

import { useState } from "react";

/** Two-letter monogram, used when a person has no portrait or the image cannot be loaded. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/**
 * One portrait box for every leadership surface (homepage, /leadership, biography
 * and department pages). Portraits are uploaded per person in the admin and stored
 * as `profiles.portrait_url`; there are no bundled photographs of named people, so
 * nothing is ever invented. If the URL is missing, or the file fails to load (a
 * deleted upload, a non-public bucket, a typo), a neutral monogram is shown on the
 * same navy panel instead of an empty or broken box. The caller supplies the size,
 * aspect ratio and any motion classes through `className`.
 */
export function LeadershipPortrait({ name, src, className = "" }: { name: string; src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-navy-mid to-navy-deep ${className}`}>
      {failed ? (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-serif text-4xl text-white/70">
          {initials(name)}
        </span>
      ) : (
        // Plain <img>: portraits are admin-uploaded URLs on Supabase Storage, not build-time assets.
        // The ref callback also catches an image that already failed before React hydrated.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
          }}
          src={src}
          alt={`Portrait of ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}
