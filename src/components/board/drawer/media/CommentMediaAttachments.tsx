"use client";
import React, { useMemo, useState } from "react";
import { Check, Download, Link2, Maximize2, Play } from "lucide-react";
import LazyVideoPlayer from "@/components/media/LazyVideoPlayer";
import CommentAttachmentChip from "../CommentAttachmentChip";
import { formatAttachmentSize } from "../drawerAttachments";
import type { DrawerAttachment, DrawerComment } from "../types";
import { CommentMediaScope, useCommentMedia } from "./CommentMediaContext";
import { attachmentToMediaItem, type ThreadMediaItem } from "./threadMedia";
import { useNearViewport } from "./useNearViewport";
import "./comment-media.scss";

export type CommentMediaAttachmentsProps = {
  attachments: DrawerAttachment[];
  /** The update they belong to, for the author and date the viewers show. */
  comment?: DrawerComment;
};

/** Up to this many image tiles show, the last one carries "+N" for the rest. */
const MAX_IMAGE_TILES = 4;

/**
 * The files of an update, the way monday shows them: images as a tiled grid
 * that opens the lightbox, videos as inline players (screen recordings
 * included), and every other file as the usual chip.
 */
export default function CommentMediaAttachments({ attachments, comment }: CommentMediaAttachmentsProps) {
  const { images, videos, files, scope_items } = useMemo(() => {
    const media = attachments.map((attachment) => ({ attachment, item: attachmentToMediaItem(attachment, comment) }));
    const image_items = media.filter((entry) => entry.item?.kind === "image").map((entry) => entry.item as ThreadMediaItem);
    const video_items = media.filter((entry) => entry.item?.kind === "video").map((entry) => entry.item as ThreadMediaItem);
    return {
      images: image_items,
      videos: video_items,
      files: media.filter((entry) => entry.item === null).map((entry) => entry.attachment),
      scope_items: [...image_items, ...video_items],
    };
  }, [attachments, comment]);

  if (attachments.length === 0) return null;

  return (
    <CommentMediaScope items={scope_items}>
      <div className="comment-media">
        {images.length > 0 && <CommentImageGrid images={images} />}
        {videos.map((video) => (
          <CommentVideoCard key={video.key} video={video} />
        ))}
        {files.length > 0 && (
          <div className="update-card__attachments comment-media__files">
            {files.map((attachment) => (
              <CommentAttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </CommentMediaScope>
  );
}

function CommentImageGrid({ images }: { images: ThreadMediaItem[] }) {
  const media = useCommentMedia();
  const visible = images.slice(0, MAX_IMAGE_TILES);
  const hidden_count = images.length - visible.length;

  return (
    <div className="comment-media__grid" data-count={visible.length}>
      {visible.map((image, index) => {
        const is_last_with_more = hidden_count > 0 && index === visible.length - 1;
        return (
          <button
            key={image.key}
            type="button"
            className="comment-media__tile"
            onClick={() => media?.openImage(image.url, image.file_name)}
            aria-label={is_last_with_more ? `Open ${image.file_name} and ${hidden_count} more images` : `Open ${image.file_name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.file_name} loading="lazy" decoding="async" draggable={false} />
            {is_last_with_more && <span className="comment-media__more">+{hidden_count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CommentVideoCard({ video }: { video: ThreadMediaItem }) {
  const media = useCommentMedia();
  const { ref, is_near } = useNearViewport<HTMLDivElement>();
  const [is_copied, setIsCopied] = useState(false);
  const can_share = /^https?:/i.test(video.url);

  const copyLink = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(video.url).then(() => {
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    });
  };

  return (
    <div ref={ref} className="comment-media__video">
      {is_near ? (
        <LazyVideoPlayer src={video.url} title={video.file_name} />
      ) : (
        <div className="comment-media__video-placeholder" aria-hidden="true">
          <Play size={26} fill="currentColor" />
        </div>
      )}
      <div className="comment-media__video-footer">
        <span className="comment-media__video-tag" aria-hidden="true">
          <Play size={10} fill="currentColor" strokeWidth={0} />
        </span>
        <span className="comment-media__video-name" title={video.file_name}>
          {video.file_name}
        </span>
        {video.size_bytes ? <span className="comment-media__video-size">{formatAttachmentSize(video.size_bytes)}</span> : null}
        <span className="comment-media__video-actions">
          <button type="button" onClick={() => media?.openVideo(video)} className="comment-media__icon-button" aria-label="Watch in a larger player" title="Watch larger">
            <Maximize2 size={14} />
          </button>
          {can_share && (
            <button type="button" onClick={copyLink} className="comment-media__icon-button" aria-label="Copy video link" title={is_copied ? "Link copied" : "Copy link"}>
              {is_copied ? <Check size={14} /> : <Link2 size={14} />}
            </button>
          )}
          {can_share && (
            <a href={video.url} target="_blank" rel="noreferrer" download={video.file_name} className="comment-media__icon-button" aria-label="Download video" title="Download">
              <Download size={14} />
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
