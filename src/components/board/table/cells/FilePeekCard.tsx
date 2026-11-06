"use client";

import { useState, type CSSProperties } from "react";
import type { CellFile } from "../types";
import { formatSize, splitFileName, thumbnailSources } from "../menus/filesCellUtils";
import CellFileThumb from "./CellFileThumb";
import "./file-peek-card.scss";

interface FilePeekCardProps {
  file: CellFile;
  /** Where the image sits among the cell's images (0 based) and how many there are, for the "1 / 3" pill and the deck behind. */
  position: number;
  total: number;
}

/** The image area grows with the picture's shape inside these bounds, so the card never jumps while the image loads. */
const FRAME_MAX_WIDTH = 288;
const FRAME_MAX_HEIGHT = 216;
const FRAME_MIN_WIDTH = 216;
const FRAME_MIN_HEIGHT = 128;
/** Used for images uploaded before their size was stored. */
const FALLBACK_RATIO = 4 / 3;

function frameSize(file: CellFile): { width: number; height: number } {
  const ratio = file.width && file.height ? file.width / file.height : FALLBACK_RATIO;
  if (ratio >= FRAME_MAX_WIDTH / FRAME_MAX_HEIGHT) {
    return { width: FRAME_MAX_WIDTH, height: Math.max(FRAME_MIN_HEIGHT, Math.round(FRAME_MAX_WIDTH / ratio)) };
  }
  return { width: Math.max(FRAME_MIN_WIDTH, Math.round(FRAME_MAX_HEIGHT * ratio)), height: FRAME_MAX_HEIGHT };
}

/**
 * The hover preview of an image in a Files cell: a floating card shaped like the picture.
 * A blurred, enlarged copy of the same image fills the space the picture leaves free (an
 * ambient glow instead of empty bars), a shimmer holds its place while it loads, then it
 * fades in and drifts in very slowly. Pills on the image give its type and its place among
 * the cell's images, a stack of cards peeks out behind when there are more, and the footer
 * shows the name, the real size and the weight.
 */
export default function FilePeekCard({ file, position, total }: FilePeekCardProps) {
  const [is_loaded, setIsLoaded] = useState(false);
  const { width, height } = frameSize(file);
  const extension = splitFileName(file.file_name).extension.toUpperCase();
  const ambient_src = thumbnailSources(file)[0];

  const meta = [file.width && file.height ? `${file.width} × ${file.height}` : null, file.size_bytes > 0 ? formatSize(file.size_bytes) : null]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <span className="file-peek" data-stacked={total > 1 ? Math.min(total - 1, 2) : undefined} style={{ "--file-peek-width": `${width}px` } as CSSProperties}>
      <span className="file-peek__card">
        <span className="file-peek__frame" data-loaded={is_loaded || undefined} style={{ height }}>
          {ambient_src && <span className="file-peek__ambient" style={{ backgroundImage: `url("${ambient_src}")` }} aria-hidden="true" />}
          <CellFileThumb file={file} loading="eager" className="file-peek__image" onLoad={() => setIsLoaded(true)} />
          <span className="file-peek__pills">
            {extension && <span className="file-peek__pill">{extension}</span>}
            {total > 1 && (
              <span className="file-peek__pill file-peek__pill--count">
                <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true">
                  <rect x="4.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11.5 14.5 H3.5 A2 2 0 0 1 1.5 12.5 V4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {position + 1} / {total}
              </span>
            )}
          </span>
          <span className="file-peek__open">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M9.5 2.5 H13.5 V6.5 M13.5 2.5 L9 7 M6.5 13.5 H2.5 V9.5 M2.5 13.5 L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Click to open
          </span>
        </span>
        <span className="file-peek__body">
          <span className="file-peek__name">{file.file_name}</span>
          {meta && <span className="file-peek__meta">{meta}</span>}
        </span>
      </span>
    </span>
  );
}
