"use client";
import React, { useMemo, useState } from "react";
import { Images, Play, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import PersonAvatar from "../../PersonAvatar";
import { useCommentMedia } from "./CommentMediaContext";
import type { ThreadMediaItem } from "./threadMedia";
import "./comment-media.scss";

type GalleryFilter = "all" | "image" | "video";

/** How many thumbnails the strip above the feed previews. */
const STRIP_PREVIEW_COUNT = 5;

/** Square thumbnail for an image or a video (its first frame, with a play badge). */
function MediaThumb({ item }: { item: ThreadMediaItem }) {
  if (item.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" loading="lazy" decoding="async" draggable={false} />;
  }
  return (
    <>
      <video src={item.url.startsWith("blob:") ? item.url : `${item.url}#t=0.5`} muted preload="metadata" playsInline aria-hidden="true" tabIndex={-1} />
      <span className="comment-media-gallery__play" aria-hidden="true">
        <Play size={14} fill="currentColor" strokeWidth={0} />
      </span>
    </>
  );
}

/**
 * "Media" row above the feed: the latest images and videos shared in the
 * item at a glance, and the way into the full gallery. Hidden while the
 * thread has none.
 */
export function UpdatesMediaStrip() {
  const media = useCommentMedia();
  const [is_gallery_open, setGalleryOpen] = useState(false);
  const items = media?.items ?? [];
  if (!media || items.length === 0) return null;

  const latest = items.slice(-STRIP_PREVIEW_COUNT).reverse();
  const hidden_count = items.length - latest.length;
  const image_count = items.filter((item) => item.kind === "image").length;
  const video_count = items.length - image_count;

  const open = (item: ThreadMediaItem) => (item.kind === "image" ? media.openImage(item.url, item.file_name) : media.openVideo(item));

  return (
    <section className="comment-media-strip" aria-label="Media shared in this item">
      <button type="button" className="comment-media-strip__label" onClick={() => setGalleryOpen(true)}>
        <Images size={15} />
        <span>Media</span>
        <span className="comment-media-strip__counts">
          {[image_count > 0 && `${image_count} ${image_count === 1 ? "image" : "images"}`, video_count > 0 && `${video_count} ${video_count === 1 ? "video" : "videos"}`]
            .filter(Boolean)
            .join(", ")}
        </span>
      </button>
      <div className="comment-media-strip__thumbs">
        {latest.map((item) => (
          <button key={item.key} type="button" className="comment-media-strip__thumb" onClick={() => open(item)} aria-label={`Open ${item.file_name}`}>
            <MediaThumb item={item} />
          </button>
        ))}
        {hidden_count > 0 && (
          <button type="button" className="comment-media-strip__thumb comment-media-strip__thumb--more" onClick={() => setGalleryOpen(true)} aria-label="Show all media">
            +{hidden_count}
          </button>
        )}
      </div>
      <button type="button" className="comment-media-strip__view-all" onClick={() => setGalleryOpen(true)}>
        View all
      </button>
      <UpdatesMediaGallery is_open={is_gallery_open} onClose={() => setGalleryOpen(false)} />
    </section>
  );
}

/**
 * Every image and video shared in the item's updates, newest first, in a
 * filterable grid with who shared it and when. Images open the lightbox
 * (swiping through all of them), videos open the large player.
 */
export function UpdatesMediaGallery({ is_open, onClose }: { is_open: boolean; onClose: () => void }) {
  const media = useCommentMedia();
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const items = useMemo(() => [...(media?.items ?? [])].reverse(), [media?.items]);
  const counts = useMemo(
    () => ({ all: items.length, image: items.filter((item) => item.kind === "image").length, video: items.filter((item) => item.kind === "video").length }),
    [items]
  );
  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  if (!media) return null;

  const tabs: { id: GalleryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "image", label: "Images" },
    { id: "video", label: "Videos" },
  ];

  return (
    <MediaDialog is_open={is_open} onClose={onClose} aria_label="Media gallery" panel_class_name="comment-media-gallery">
      <header className="comment-media-gallery__header">
        <div>
          <h2 className="comment-media-gallery__title">Media gallery</h2>
          <p className="comment-media-gallery__subtitle">Images and videos shared in this item&apos;s updates</p>
        </div>
        <button type="button" className="comment-media-gallery__close" onClick={onClose} aria-label="Close gallery">
          <X size={18} />
        </button>
      </header>

      <div className="comment-media-gallery__tabs" role="tablist" aria-label="Media type">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className="comment-media-gallery__tab"
            onClick={() => setFilter(tab.id)}
            disabled={tab.id !== "all" && counts[tab.id] === 0}
          >
            {tab.label}
            <span className="comment-media-gallery__tab-count">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="comment-media-gallery__empty">Nothing here yet.</div>
      ) : (
        <ul className="comment-media-gallery__grid">
          {visible.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className="comment-media-gallery__tile"
                onClick={() => (item.kind === "image" ? media.openImage(item.url, item.file_name) : media.openVideo(item))}
                aria-label={`Open ${item.file_name}`}
              >
                <span className="comment-media-gallery__thumb">
                  <MediaThumb item={item} />
                </span>
                <span className="comment-media-gallery__caption">
                  {item.author && <PersonAvatar person={item.author} size={20} />}
                  <span className="comment-media-gallery__caption-text">
                    <span className="comment-media-gallery__file">{item.file_name}</span>
                    <span className="comment-media-gallery__when">{[item.author?.name, item.posted_at].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </MediaDialog>
  );
}
