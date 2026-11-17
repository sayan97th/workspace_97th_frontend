"use client";
import React, { useRef } from "react";
import {
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaLoadingIndicator,
  MediaMuteButton,
  MediaPipButton,
  MediaPlayButton,
  MediaPlaybackRateButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import "./video-player.scss";

export type VideoPlayerProps = {
  src: string;
  /** Read by screen readers and shown by the browser's own Picture in Picture window. */
  title: string;
  /** "inline" sits inside an update card, "theater" fills a dark dialog. */
  variant?: "inline" | "theater";
  autoplay?: boolean;
  className?: string;
};

/**
 * A browser recording in WebM is written while it is captured, so its header
 * carries no duration and the browser reports `Infinity`: the seek bar can't
 * work. Seeking far past the end makes the browser scan the file and learn
 * the real duration, then the playhead goes back to the start.
 * Recordings made by our own recorder are already fixed before upload
 * (`fix-webm-duration`), this covers videos recorded elsewhere.
 */
function resolveUnknownDuration(video: HTMLVideoElement) {
  if (video.duration !== Infinity) return;
  const rewind = () => {
    video.removeEventListener("timeupdate", rewind);
    video.currentTime = 0;
  };
  video.addEventListener("timeupdate", rewind);
  video.currentTime = Number.MAX_SAFE_INTEGER;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Video player for update attachments and screen recordings, built on Mux's
 * `media-chrome` (MIT): keyboard shortcuts (space, arrows, m, f, k), speed,
 * Picture in Picture and full screen out of the box, themed through the CSS
 * custom properties in `video-player.scss` to match the drawer.
 *
 * Plays whatever the browser can decode natively (MP4 H.264, WebM VP8/VP9,
 * QuickTime on Safari), there is no streaming or transcoding step.
 */
export default function VideoPlayer({ src, title, variant = "inline", autoplay = false, className }: VideoPlayerProps) {
  const video_ref = useRef<HTMLVideoElement>(null);
  // `#t=0.001` makes Safari paint the first frame as a poster instead of a black box.
  const media_src = src.startsWith("blob:") || src.includes("#") ? src : `${src}#t=0.001`;

  return (
    <MediaController className={`video-player video-player--${variant} ${className ?? ""}`} aria-label={title}>
      <video
        ref={video_ref}
        slot="media"
        src={media_src}
        preload="metadata"
        playsInline
        autoPlay={autoplay}
        title={title}
        onLoadedMetadata={(event) => resolveUnknownDuration(event.currentTarget)}
      />
      <MediaLoadingIndicator slot="centered-chrome" noAutohide className="video-player__loading" />
      <MediaPlayButton slot="centered-chrome" className="video-player__big-play" />
      <MediaControlBar className="video-player__bar">
        <MediaPlayButton className="video-player__button" />
        <MediaTimeRange className="video-player__range" />
        <MediaTimeDisplay showDuration className="video-player__time" />
        <MediaMuteButton className="video-player__button" />
        <MediaVolumeRange className="video-player__volume" />
        <MediaPlaybackRateButton rates={PLAYBACK_RATES} className="video-player__button video-player__rate" />
        <MediaPipButton className="video-player__button video-player__pip" />
        <MediaFullscreenButton className="video-player__button" />
      </MediaControlBar>
    </MediaController>
  );
}
