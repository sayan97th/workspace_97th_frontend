"use client";
import React from "react";
import { Play, X } from "lucide-react";
import CommentAttachmentChip from "../CommentAttachmentChip";
import { formatAttachmentSize } from "../drawerAttachments";
import type { DrawerAttachment } from "../types";
import "./comment-media.scss";

export type ComposerAttachmentTrayProps = {
  attachments: DrawerAttachment[];
  onRemove: (attachment_id: string) => void;
  /** 0 to 1 while the update and its files upload. */
  upload_progress?: number | null;
};

/** Images and videos with something to show (a local preview or the uploaded file). */
const isPreviewable = (attachment: DrawerAttachment) =>
  (attachment.media_kind === "image" || attachment.media_kind === "video") && Boolean(attachment.preview_url ?? attachment.download_url);

/**
 * Files waiting under a composer before the update is sent. Images and videos
 * (a fresh screen recording included) show as thumbnails so the author sees
 * exactly what is about to be shared; other files keep the compact chip.
 */
export default function ComposerAttachmentTray({ attachments, onRemove, upload_progress = null }: ComposerAttachmentTrayProps) {
  if (attachments.length === 0) return null;
  const is_uploading = upload_progress !== null;
  const media = attachments.filter(isPreviewable);
  const files = attachments.filter((attachment) => !isPreviewable(attachment));

  return (
    <div className="composer-tray">
      {media.length > 0 && (
        <ul className="composer-tray__media">
          {media.map((attachment) => {
            const url = attachment.preview_url ?? attachment.download_url ?? "";
            return (
              <li key={attachment.id} className="composer-tray__tile" title={attachment.file_name}>
                {attachment.media_kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" draggable={false} />
                ) : (
                  <>
                    <video src={url} muted preload="metadata" playsInline aria-hidden="true" tabIndex={-1} />
                    <span className="composer-tray__play" aria-hidden="true">
                      <Play size={12} fill="currentColor" strokeWidth={0} />
                    </span>
                  </>
                )}
                <span className="composer-tray__caption">
                  <span className="composer-tray__name">{attachment.file_name}</span>
                  {attachment.size_bytes ? <span className="composer-tray__size">{formatAttachmentSize(attachment.size_bytes)}</span> : null}
                </span>
                {!is_uploading && (
                  <button type="button" onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.file_name}`} className="composer-tray__remove">
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((attachment) => (
            <CommentAttachmentChip key={attachment.id} attachment={attachment} onRemove={is_uploading ? undefined : onRemove} />
          ))}
        </div>
      )}

      {is_uploading && (
        <div
          className="composer-tray__progress"
          role="progressbar"
          aria-label="Uploading files"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(upload_progress * 100)}
        >
          <span className="composer-tray__progress-track">
            <span className="composer-tray__progress-fill" style={{ width: `${Math.max(3, upload_progress * 100)}%` }} />
          </span>
          <span className="composer-tray__progress-label">{upload_progress >= 1 ? "Processing" : `Uploading ${Math.round(upload_progress * 100)}%`}</span>
        </div>
      )}
    </div>
  );
}
