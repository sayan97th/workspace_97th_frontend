"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Link2, Maximize2, MoreHorizontal, Play, RefreshCw, Trash2, Upload, Video } from "lucide-react";
import LazyVideoPlayer from "@/components/media/LazyVideoPlayer";
import { useScreenRecorder } from "@/components/recorder/ScreenRecorderProvider";
import CommentAttachmentChip from "../CommentAttachmentChip";
import { formatAttachmentSize } from "../drawerAttachments";
import type { DrawerAttachment, DrawerComment } from "../types";
import { useCommentAttachmentActions } from "./CommentAttachmentActionsContext";
import { CommentMediaScope, useCommentMedia } from "./CommentMediaContext";
import { attachmentToMediaItem, type ThreadMediaItem } from "./threadMedia";
import { useNearViewport } from "./useNearViewport";
import "./comment-media.scss";

export type CommentMediaAttachmentsProps = {
  attachments: DrawerAttachment[];
  /** The update they belong to, for the author and date the viewers show, and who may change them. */
  comment?: DrawerComment;
};

/** A slide: the media item plus the attachment it came from (its id is what delete and replace act on). */
type Slide = { item: ThreadMediaItem; attachment: DrawerAttachment };

/** A horizontal swipe this long (in px) moves to the next or previous slide on touch screens. */
const SWIPE_THRESHOLD = 48;
/** Files a replacement may be picked from, the media types the API accepts. */
const REPLACE_ACCEPT = ".mp4,.webm,.mov,.m4v,.png,.jpg,.jpeg,.gif,.webp";

/**
 * The files of one update: its images and videos in a slider (arrows, swipe,
 * keyboard, thumbnails), and every other file as the usual chip. Images open
 * the lightbox over this update's images, videos play in place. The author
 * can replace a file (record a video again, or upload another file) or delete
 * it, the stored file is removed from S3 by the API.
 */
export default function CommentMediaAttachments({ attachments, comment }: CommentMediaAttachmentsProps) {
  const { slides, files, scope_items } = useMemo(() => {
    const media_slides: Slide[] = [];
    const other_files: DrawerAttachment[] = [];
    attachments.forEach((attachment) => {
      const item = attachmentToMediaItem(attachment, comment);
      if (item) media_slides.push({ item, attachment });
      else other_files.push(attachment);
    });
    return { slides: media_slides, files: other_files, scope_items: media_slides.map((slide) => slide.item) };
  }, [attachments, comment]);

  if (attachments.length === 0) return null;

  return (
    <CommentMediaScope items={scope_items}>
      <div className="comment-media">
        {slides.length > 0 && <CommentMediaCarousel slides={slides} comment={comment} />}
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

type PendingAction = { kind: "replacing"; progress: number } | { kind: "deleting" } | null;

function CommentMediaCarousel({ slides, comment }: { slides: Slide[]; comment?: DrawerComment }) {
  const media = useCommentMedia();
  const actions = useCommentAttachmentActions();
  const recorder = useScreenRecorder();
  const { ref: near_ref, is_near } = useNearViewport<HTMLDivElement>();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [is_menu_open, setMenuOpen] = useState(false);
  const [is_confirming_delete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [is_copied, setIsCopied] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const menu_ref = useRef<HTMLDivElement>(null);
  const swipe_start_ref = useRef<number | null>(null);

  // A slide that was deleted (or a shorter list after an edit) never leaves the index out of range.
  const safe_index = Math.min(index, slides.length - 1);
  const current = slides[safe_index];
  const has_many = slides.length > 1;
  const can_manage = Boolean(actions && comment && comment.author.id === actions.current_user_id && /^\d+$/.test(current.attachment.id));
  const is_busy = pending !== null;
  // Deleting the only file of an update without text deletes the update itself.
  const is_whole_update = Boolean(comment && slides.length === 1 && comment.attachments.length === 1 && !comment.body.trim());
  const kind_label = current.item.kind === "video" ? "video" : "image";

  useEffect(() => {
    setConfirmingDelete(false);
    setMenuOpen(false);
  }, [safe_index]);

  // The replace menu closes on any click outside it.
  useEffect(() => {
    if (!is_menu_open) return;
    const close = (event: PointerEvent) => {
      if (!menu_ref.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [is_menu_open]);

  const goTo = (next_index: number) => {
    if (!has_many || is_busy) return;
    const wrapped = (next_index + slides.length) % slides.length;
    setDirection(next_index > safe_index ? "next" : "previous");
    setIndex(wrapped);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Arrow keys inside the video player seek, they belong to it.
    if ((event.target as HTMLElement).closest("media-controller")) return;
    if (event.key === "ArrowRight") goTo(safe_index + 1);
    else if (event.key === "ArrowLeft") goTo(safe_index - 1);
    else return;
    event.preventDefault();
  };

  const copyLink = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(current.item.url).then(() => {
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    });
  };

  const replaceWith = async (file: File) => {
    if (!actions || !comment) return;
    setPending({ kind: "replacing", progress: 0 });
    try {
      await actions.replaceAttachment(comment.id, current.attachment.id, file, (progress) => setPending({ kind: "replacing", progress }));
    } catch {
      // The drawer shows the error banner.
    } finally {
      setPending(null);
    }
  };

  const recordReplacement = () => {
    if (!actions || !comment || !recorder) return;
    setMenuOpen(false);
    const comment_id = comment.id;
    const attachment_id = current.attachment.id;
    recorder.requestRecording({
      target_key: `replace:${comment_id}:${attachment_id}`,
      submit_label: "Replace video",
      postFallback: (file, onProgress) => actions.replaceAttachment(comment_id, attachment_id, file, onProgress),
    });
  };

  const confirmDelete = async () => {
    if (!actions || !comment) return;
    setConfirmingDelete(false);
    if (is_whole_update) {
      actions.deleteComment(comment.id);
      return;
    }
    setPending({ kind: "deleting" });
    try {
      await actions.deleteAttachment(comment.id, current.attachment.id);
    } catch {
      // The drawer shows the error banner.
    } finally {
      setPending(null);
    }
  };

  return (
    <div ref={near_ref} className="comment-carousel" onKeyDown={handleKeyDown} aria-roledescription="carousel" aria-label="Images and videos of this update">
      <div
        className="comment-carousel__stage"
        onPointerDown={(event) => {
          if (event.pointerType === "touch") swipe_start_ref.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const start = swipe_start_ref.current;
          swipe_start_ref.current = null;
          if (start === null) return;
          const distance = event.clientX - start;
          if (Math.abs(distance) >= SWIPE_THRESHOLD) goTo(safe_index + (distance < 0 ? 1 : -1));
        }}
      >
        <div
          key={current.item.key}
          className="comment-carousel__slide"
          data-direction={direction}
          role="group"
          aria-roledescription="slide"
          aria-label={`${safe_index + 1} of ${slides.length}: ${current.item.file_name}`}
        >
          {current.item.kind === "image" ? (
            <button type="button" className="comment-carousel__image" onClick={() => media?.openImage(current.item.url, current.item.file_name)} aria-label={`Open ${current.item.file_name} full screen`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.item.url} alt={current.item.file_name} decoding="async" draggable={false} />
            </button>
          ) : is_near ? (
            <LazyVideoPlayer src={current.item.url} title={current.item.file_name} />
          ) : (
            <div className="comment-media__video-placeholder" aria-hidden="true">
              <Play size={26} fill="currentColor" />
            </div>
          )}
        </div>

        {has_many && (
          <>
            <span className="comment-carousel__counter" aria-hidden="true">
              {safe_index + 1} / {slides.length}
            </span>
            <button type="button" className="comment-carousel__arrow comment-carousel__arrow--previous" onClick={() => goTo(safe_index - 1)} aria-label="Previous" disabled={is_busy}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="comment-carousel__arrow comment-carousel__arrow--next" onClick={() => goTo(safe_index + 1)} aria-label="Next" disabled={is_busy}>
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {pending && (
          <div className="comment-carousel__overlay" role="status">
            <span className="comment-carousel__spinner" aria-hidden="true" />
            {pending.kind === "deleting" ? `Deleting ${kind_label}` : pending.progress >= 1 ? "Processing" : `Uploading ${Math.round(pending.progress * 100)}%`}
            {pending.kind === "replacing" && (
              <span className="comment-carousel__overlay-bar">
                <span style={{ width: `${Math.max(4, pending.progress * 100)}%` }} />
              </span>
            )}
          </div>
        )}

        {is_confirming_delete && (
          <div className="comment-carousel__overlay comment-carousel__overlay--confirm" role="alertdialog" aria-label={`Delete this ${kind_label}?`}>
            <Trash2 size={22} />
            <strong>Delete this {kind_label}?</strong>
            <span>{is_whole_update ? "It is all this update has, so the whole update is deleted." : "It is removed from the update for everyone."}</span>
            <span className="comment-carousel__confirm-actions">
              <button type="button" className="comment-carousel__confirm-button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button type="button" className="comment-carousel__confirm-button comment-carousel__confirm-button--danger" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="comment-carousel__footer">
        <span className="comment-carousel__tag" data-kind={current.item.kind} aria-hidden="true">
          {current.item.kind === "video" ? <Play size={10} fill="currentColor" strokeWidth={0} /> : "IMG"}
        </span>
        <span className="comment-carousel__name" title={current.item.file_name}>
          {current.item.file_name}
        </span>
        {current.item.size_bytes ? <span className="comment-carousel__size">{formatAttachmentSize(current.item.size_bytes)}</span> : null}

        <span className="comment-carousel__actions">
          <button
            type="button"
            onClick={() => (current.item.kind === "image" ? media?.openImage(current.item.url, current.item.file_name) : media?.openVideo(current.item))}
            className="comment-media__icon-button"
            aria-label="View larger"
            title="View larger"
          >
            <Maximize2 size={14} />
          </button>
          {/^https?:/i.test(current.item.url) && (
            <>
              <button type="button" onClick={copyLink} className="comment-media__icon-button" aria-label="Copy link" title={is_copied ? "Link copied" : "Copy link"}>
                {is_copied ? <Check size={14} /> : <Link2 size={14} />}
              </button>
              <a href={current.item.url} target="_blank" rel="noreferrer" download={current.item.file_name} className="comment-media__icon-button" aria-label="Download" title="Download">
                <Download size={14} />
              </a>
            </>
          )}

          {can_manage && (
            <>
              <span className="comment-carousel__divider" aria-hidden="true" />
              <div ref={menu_ref} className="comment-carousel__menu-anchor">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="comment-media__icon-button"
                  aria-label={`Replace or delete this ${kind_label}`}
                  aria-haspopup="menu"
                  aria-expanded={is_menu_open}
                  title="More"
                  disabled={is_busy}
                >
                  <MoreHorizontal size={16} />
                </button>
                {is_menu_open && (
                  <div className="comment-carousel__menu" role="menu">
                    {current.item.kind === "video" && recorder?.is_supported && (
                      <button type="button" role="menuitem" className="comment-carousel__menu-item" onClick={recordReplacement} disabled={recorder.is_busy}>
                        <Video size={15} />
                        <span>
                          Record again
                          <small>Replace it with a new recording</small>
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="comment-carousel__menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        file_input_ref.current?.click();
                      }}
                    >
                      {current.item.kind === "video" ? <Upload size={15} /> : <RefreshCw size={15} />}
                      <span>
                        Replace with a file
                        <small>Upload another video or image</small>
                      </span>
                    </button>
                    <span className="comment-carousel__menu-separator" aria-hidden="true" />
                    <button
                      type="button"
                      role="menuitem"
                      className="comment-carousel__menu-item comment-carousel__menu-item--danger"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmingDelete(true);
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Delete {kind_label}</span>
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={file_input_ref}
                type="file"
                accept={REPLACE_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void replaceWith(file);
                }}
              />
            </>
          )}
        </span>
      </div>

      {has_many && (
        <div className="comment-carousel__thumbs" role="tablist" aria-label="Choose a slide">
          {slides.map((slide, slide_index) => (
            <button
              key={slide.item.key}
              type="button"
              role="tab"
              aria-selected={slide_index === safe_index}
              aria-label={`Show ${slide.item.file_name}`}
              className="comment-carousel__thumb"
              onClick={() => goTo(slide_index)}
              disabled={is_busy}
            >
              {slide.item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.item.url} alt="" loading="lazy" decoding="async" draggable={false} />
              ) : (
                <>
                  {is_near && <video src={slide.item.url.startsWith("blob:") ? slide.item.url : `${slide.item.url}#t=0.5`} muted preload="metadata" playsInline tabIndex={-1} aria-hidden="true" />}
                  <span className="comment-carousel__thumb-play" aria-hidden="true">
                    <Play size={10} fill="currentColor" strokeWidth={0} />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
