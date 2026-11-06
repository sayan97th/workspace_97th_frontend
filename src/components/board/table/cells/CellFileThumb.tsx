"use client";

import { useState } from "react";
import type { CellFile } from "../types";
import { thumbnailSources } from "../menus/filesCellUtils";

interface CellFileThumbProps {
  file: CellFile;
  /** Lazy for thumbnails in the table and menu, eager for a hover preview that is already on screen. */
  loading?: "lazy" | "eager";
  className?: string;
}

/**
 * A small rendering of an uploaded image that always ends up showing something. It loads the
 * light WebP thumbnail, falls back to the original when the thumbnail fails (an old upload,
 * a missing variant), and finally to a neutral image glyph, never a broken image icon.
 * Decoding happens off the main thread, so scrolling a table full of them stays smooth.
 */
export default function CellFileThumb({ file, loading = "lazy", className }: CellFileThumbProps) {
  const sources = thumbnailSources(file);
  // Keyed by the first source, so a renamed or replaced entry starts over from its thumbnail.
  const [failed, setFailed] = useState<{ key: string; count: number }>({ key: "", count: 0 });
  const source_key = sources[0] ?? "";
  const failed_count = failed.key === source_key ? failed.count : 0;
  const src = sources[failed_count];

  if (!src) {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" className={className}>
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="6" cy="6.5" r="1.2" fill="currentColor" />
        <path d="M3 12 L7 8.5 L9.5 10.5 L11 9 L13 11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- user uploads on the API's storage disk, already resized server side
    <img
      src={src}
      alt=""
      loading={loading}
      decoding="async"
      draggable={false}
      className={className}
      onError={() => setFailed({ key: source_key, count: failed_count + 1 })}
    />
  );
}
