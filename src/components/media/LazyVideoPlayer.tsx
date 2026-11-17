"use client";
import dynamic from "next/dynamic";
import type { VideoPlayerProps } from "./VideoPlayer";

/** Same 16:9 dark frame the player draws, shown while its code loads. */
function VideoPlayerPlaceholder() {
  return <div className="aspect-video max-h-[380px] w-full animate-pulse rounded-xl bg-[#1b1d26]" aria-hidden="true" />;
}

/**
 * `VideoPlayer` loaded on demand: media-chrome registers custom elements, so
 * it only runs in the browser, and boards without videos never download it.
 */
const LazyVideoPlayer = dynamic<VideoPlayerProps>(() => import("./VideoPlayer"), {
  ssr: false,
  loading: VideoPlayerPlaceholder,
});

export default LazyVideoPlayer;
