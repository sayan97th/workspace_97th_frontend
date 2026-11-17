"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CellFile } from "../../table/types";
import VideoTheaterDialog from "./VideoTheaterDialog";
import { toViewerFile, type ThreadMediaItem } from "./threadMedia";

// PhotoSwipe (with its CSS) only downloads the first time someone opens an image.
const FileImageViewer = dynamic(() => import("../../table/menus/FileImageViewer"), { ssr: false });

type CommentMediaContextValue = {
  /** Every image and video of the thread, oldest first. */
  items: ThreadMediaItem[];
  /** Opens the lightbox on this image, swiping through every image of the thread. Unknown URLs open on their own. */
  openImage: (url: string, file_name?: string) => void;
  openVideo: (item: ThreadMediaItem) => void;
};

const CommentMediaContext = createContext<CommentMediaContextValue | null>(null);

type ViewerState = { kind: "image"; files: CellFile[]; index: number; key: number } | { kind: "video"; item: ThreadMediaItem } | null;

/**
 * Shares one lightbox and one video theater between every update of a
 * thread, so opening any image lets the viewer swipe through all the images
 * people shared in that item, like monday's update gallery. Images open in
 * the PhotoSwipe viewer the Files cell already uses (zoom, pan, thumbnails,
 * download, full screen).
 */
export function CommentMediaProvider({ items, children }: { items: ThreadMediaItem[]; children: React.ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState>(null);
  const images = useMemo(() => items.filter((item) => item.kind === "image"), [items]);

  const openImage = useCallback(
    (url: string, file_name?: string) => {
      const index = images.findIndex((item) => item.url === url);
      const files = index >= 0 ? images.map(toViewerFile) : [toViewerFile({ key: url, url, file_name: file_name ?? "Image" })];
      setViewer({ kind: "image", files, index: Math.max(index, 0), key: Date.now() });
    },
    [images]
  );

  const openVideo = useCallback((item: ThreadMediaItem) => setViewer({ kind: "video", item }), []);

  const value = useMemo(() => ({ items, openImage, openVideo }), [items, openImage, openVideo]);

  return (
    <CommentMediaContext.Provider value={value}>
      {children}
      {viewer?.kind === "image" && <FileImageViewer key={viewer.key} images={viewer.files} index={viewer.index} onClose={() => setViewer(null)} />}
      <VideoTheaterDialog item={viewer?.kind === "video" ? viewer.item : null} onClose={() => setViewer(null)} />
    </CommentMediaContext.Provider>
  );
}

export function useCommentMedia(): CommentMediaContextValue | null {
  return useContext(CommentMediaContext);
}

/**
 * Gives `children` a lightbox: the thread's shared one when rendered inside
 * an `UpdatesPanel`, or a private one over `items` anywhere else (a Kanban
 * card, the Update Feed).
 */
export function CommentMediaScope({ items, children }: { items: ThreadMediaItem[]; children: React.ReactNode }) {
  const parent = useCommentMedia();
  if (parent) return <>{children}</>;
  return <CommentMediaProvider items={items}>{children}</CommentMediaProvider>;
}
