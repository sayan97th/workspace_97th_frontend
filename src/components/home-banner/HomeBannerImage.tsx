"use client";
import React, { useEffect, useRef, useState } from "react";
import type { HomeBannerFraming } from "@/types/home-banner";
import { bannerImageStyle, scrimStyle, type ResolvedTextTone } from "./bannerFraming";

export type BannerImageSource = {
  image_url: string;
  /** Lighter rendition the browser picks on narrow screens. */
  image_small_url?: string | null;
  placeholder?: string | null;
  dominant_color?: string | null;
};

type HomeBannerImageProps = {
  source: BannerImageSource;
  framing: Pick<HomeBannerFraming, "focal_x" | "focal_y" | "zoom" | "overlay_opacity">;
  tone: ResolvedTextTone;
  /** The Home hero is the largest thing above the fold, so its image downloads first. */
  is_priority?: boolean;
  /** `sizes` for the responsive image, defaults to the Home hero's width. */
  sizes?: string;
  /** Turns off the fade in while the image is being dragged in the editor. */
  is_interactive?: boolean;
};

/**
 * The picture layers behind the Home greeting, shared by the hero and every editor preview:
 *
 * 1. the average color plus a tiny blurred copy, painted instantly from the API payload;
 * 2. the real image (small or large rendition, the browser picks), faded in once decoded;
 * 3. a shade that keeps the greeting readable, strongest under the text.
 */
const HomeBannerImage: React.FC<HomeBannerImageProps> = ({
  source,
  framing,
  tone,
  is_priority = false,
  sizes = "(max-width: 768px) 100vw, 1216px",
  is_interactive = false,
}) => {
  const image_ref = useRef<HTMLImageElement>(null);
  const [loaded_url, setLoadedUrl] = useState<string | null>(null);
  const is_loaded = loaded_url === source.image_url;

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    const image = image_ref.current;
    if (image?.complete && image.naturalWidth > 0) setLoadedUrl(source.image_url);
  }, [source.image_url]);

  const src_set = source.image_small_url && source.image_small_url !== source.image_url
    ? `${source.image_small_url} 1280w, ${source.image_url} 2560w`
    : undefined;

  return (
    <div
      className="home-banner-layers"
      data-loaded={is_loaded || undefined}
      data-interactive={is_interactive || undefined}
      style={{ backgroundColor: source.dominant_color ?? undefined }}
      aria-hidden="true"
    >
      {source.placeholder ? (
        // eslint-disable-next-line @next/next/no-img-element -- an inline data URI, nothing for next/image to optimize.
        <img src={source.placeholder} alt="" className="home-banner-placeholder" style={bannerImageStyle(framing)} draggable={false} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- already resized WebP renditions from the API, with srcSet. */}
      <img
        ref={image_ref}
        src={source.image_url}
        srcSet={src_set}
        sizes={src_set ? sizes : undefined}
        alt=""
        decoding="async"
        fetchPriority={is_priority ? "high" : "auto"}
        loading={is_priority ? "eager" : "lazy"}
        draggable={false}
        onLoad={() => setLoadedUrl(source.image_url)}
        className="home-banner-photo"
        style={bannerImageStyle(framing)}
      />
      <div className="home-banner-scrim" style={scrimStyle(tone, framing.overlay_opacity)} />
    </div>
  );
};

export default HomeBannerImage;
