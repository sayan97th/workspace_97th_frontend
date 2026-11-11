"use client";

import type { CSSProperties } from "react";
import { splitFileName } from "../menus/filesCellUtils";
import type { PendingUpload, UploadSummary } from "./useCellFileUploads";
import "./file-upload-status.scss";

/** Color family of a file type badge, see `.file-type-badge[data-tone]`. */
type FileTone = "pdf" | "sheet" | "doc" | "slides" | "image" | "other";

const TONE_BY_EXTENSION: Record<string, FileTone> = {
  pdf: "pdf",
  xlsx: "sheet",
  xls: "sheet",
  csv: "sheet",
  docx: "doc",
  doc: "doc",
  pptx: "slides",
  ppt: "slides",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
};

/** A small colored square with the file's extension ("PDF", "XLSX"), used before a preview exists. */
export function FileTypeBadge({ file_name }: { file_name: string }) {
  const extension = splitFileName(file_name).extension.toLowerCase();
  const tone = TONE_BY_EXTENSION[extension] ?? "other";
  const label = (extension || "file").slice(0, 4).toUpperCase();
  return (
    <span className="file-type-badge" data-tone={tone} aria-hidden="true">
      {label}
    </span>
  );
}

/** The preview square of a pending file: its local image, else its type badge. */
export function PendingThumb({ upload }: { upload: PendingUpload }) {
  return upload.preview_url ? (
    // A local blob, `next/image` cannot optimize it and does not need to.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={upload.preview_url} alt="" className="file-upload-status__image" draggable={false} />
  ) : (
    <FileTypeBadge file_name={upload.file_name} />
  );
}

function statusLabel(summary: UploadSummary): string {
  switch (summary.status) {
    case "queued":
      return "Waiting";
    case "uploading":
      return `${Math.round(summary.progress * 100)}%`;
    case "processing":
      return "Saving";
    case "failed":
      return "Failed";
  }
}

function announcement(summary: UploadSummary, name: string): string {
  switch (summary.status) {
    case "queued":
      return `${name} is waiting to upload.`;
    case "uploading":
      return `Uploading ${name}.`;
    case "processing":
      return `Saving ${name}.`;
    case "failed":
      return `${name} could not be uploaded. ${summary.error ?? ""}`;
  }
}

interface FileUploadStatusProps {
  summary: UploadSummary;
  /** A failed batch's retry button. */
  onRetry: (batch_id: string) => void;
  /** A failed batch's "×", forgets the files. */
  onDismiss: (batch_id: string) => void;
}

/**
 * What a Files cell shows while its files upload, so the upload is visible from the first
 * moment instead of after a refresh:
 * - the file's own preview (a local copy of an image, or a colored type badge) under a veil
 *   that lifts as the bytes go out, with a stacked card behind it when several files go together;
 * - the file name, and a chip with the percentage, "Saving" while the server stores it,
 *   or "Failed" with Retry and "×";
 * - a thin determinate bar along the bottom edge of the cell.
 * Once saved, the real entry takes over at once and `FilesCell` marks it with "Uploaded".
 */
export default function FileUploadStatus({ summary, onRetry, onDismiss }: FileUploadStatusProps) {
  const { lead, status, file_count, queued_count } = summary;
  const name = file_count > 1 ? `${file_count} files` : lead.file_name;
  const waiting_count = queued_count > 0 ? `+${queued_count}` : null;
  const style = { "--upload-progress": status === "processing" ? 1 : summary.progress } as CSSProperties;

  return (
    <div className="file-upload-status" data-status={status} style={style} title={status === "failed" ? (summary.error ?? undefined) : undefined}>
      <span className="file-upload-status__thumb" data-stacked={file_count > 1 || undefined}>
        <PendingThumb upload={lead} />
        <span className="file-upload-status__veil" aria-hidden="true" />
        {status === "failed" && (
          <span className="file-upload-status__badge file-upload-status__badge--failed" aria-hidden="true">
            !
          </span>
        )}
      </span>

      <span className="file-upload-status__name">{name}</span>
      {waiting_count && (
        <span className="file-upload-status__waiting" title={`${queued_count} more waiting`}>
          {waiting_count}
          <span className="file-upload-status__waiting-text"> waiting</span>
        </span>
      )}
      <span className="file-upload-status__chip">
        {status === "processing" && <span className="file-upload-status__spinner" aria-hidden="true" />}
        {statusLabel(summary)}
      </span>

      {status === "failed" && (
        <span className="file-upload-status__actions">
          <button type="button" className="file-upload-status__action" onClick={() => onRetry(summary.batch_id)} aria-label={`Retry uploading ${name}`} title="Retry">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M13 8 A5 5 0 1 1 11.5 4.4 M13 2.5 V5 H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="file-upload-status__action" onClick={() => onDismiss(summary.batch_id)} aria-label={`Dismiss ${name}`} title="Dismiss">
            <svg viewBox="0 0 14 14" width="9" height="9" aria-hidden="true">
              <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      )}

      <span className="file-upload-status__bar" aria-hidden="true" />
      <span className="sr-only" role="status" aria-live="polite">
        {announcement(summary, name)}
      </span>
    </div>
  );
}
