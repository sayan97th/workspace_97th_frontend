"use client";
import React from "react";
import { Download, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import LazyVideoPlayer from "@/components/media/LazyVideoPlayer";
import { formatAttachmentSize } from "../drawerAttachments";
import PersonAvatar from "../../PersonAvatar";
import type { ThreadMediaItem } from "./threadMedia";
import "./comment-media.scss";

/** A video played large on a dark backdrop, opened from the media gallery or a video card's expand button. */
export default function VideoTheaterDialog({ item, onClose }: { item: ThreadMediaItem | null; onClose: () => void }) {
  return (
    <MediaDialog is_open={item !== null} onClose={onClose} aria_label={item?.file_name ?? "Video"} tone="dark">
      {item && (
        <>
          <div className="comment-media-theater__top">
            <div className="comment-media-theater__who">
              {item.author && <PersonAvatar person={item.author} size={30} />}
              <div className="min-w-0">
                <div className="comment-media-theater__name">{item.file_name}</div>
                <div className="comment-media-theater__meta">
                  {[item.author?.name, item.posted_at, formatAttachmentSize(item.size_bytes)].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <div className="comment-media-theater__actions">
              <a href={item.url} target="_blank" rel="noreferrer" download={item.file_name} className="comment-media-theater__button" aria-label="Download video" title="Download">
                <Download size={18} />
              </a>
              <button type="button" onClick={onClose} className="comment-media-theater__button" aria-label="Close video" title="Close (Esc)">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="comment-media-theater__stage" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <LazyVideoPlayer src={item.url} title={item.file_name} variant="theater" autoplay />
          </div>
        </>
      )}
    </MediaDialog>
  );
}
