import type React from "react";
import type { HomeBannerDto, HomeBannerFraming, HomeBannerState, HomeBannerTextTone } from "@/types/home-banner";

/** A fresh image starts centered, unzoomed, with the text color picked for it. */
export const DEFAULT_BANNER_FRAMING: HomeBannerFraming = {
  focal_x: 50,
  focal_y: 50,
  zoom: 1,
  text_tone: "auto",
  overlay_opacity: 35,
};

export const MIN_BANNER_ZOOM = 1;
export const MAX_BANNER_ZOOM = 3;
export const MAX_BANNER_OVERLAY = 80;

/** Above this brightness the image is light enough for dark text. */
const LIGHT_IMAGE_LUMINANCE = 0.62;

/** Brand Neutral 700 for the dark shade, Neutral 50 for the light one (97 Style Guide). */
const SCRIM_RGB = { light: "10, 23, 23", dark: "250, 250, 245" } as const;

export type ResolvedTextTone = Exclude<HomeBannerTextTone, "auto">;

/** Personal first, then the organization banner, then none (the built in gradient). */
export const effectiveBanner = (state: HomeBannerState | null): HomeBannerDto | null =>
  state?.personal ?? state?.organization ?? null;

export const framingOf = (banner: HomeBannerDto): HomeBannerFraming => ({
  focal_x: banner.focal_x,
  focal_y: banner.focal_y,
  zoom: banner.zoom,
  text_tone: banner.text_tone,
  overlay_opacity: banner.overlay_opacity,
});

export const isSameFraming = (first: HomeBannerFraming, second: HomeBannerFraming): boolean =>
  Math.abs(first.focal_x - second.focal_x) < 0.01 &&
  Math.abs(first.focal_y - second.focal_y) < 0.01 &&
  Math.abs(first.zoom - second.zoom) < 0.001 &&
  first.text_tone === second.text_tone &&
  first.overlay_opacity === second.overlay_opacity;

/**
 * The color the greeting is written in. With `auto`, light images get dark text, but a strong
 * shade darkens the image first, so it is taken into account.
 */
export const resolveTextTone = (text_tone: HomeBannerTextTone, luminance: number, overlay_opacity: number): ResolvedTextTone => {
  if (text_tone !== "auto") return text_tone;
  const shaded_luminance = luminance * (1 - overlay_opacity / 100);
  return shaded_luminance > LIGHT_IMAGE_LUMINANCE ? "dark" : "light";
};

/** The shade sits under the text: dark behind light text, light behind dark text. */
export const scrimStyle = (tone: ResolvedTextTone, overlay_opacity: number): React.CSSProperties =>
  ({
    "--banner-scrim-rgb": SCRIM_RGB[tone],
    "--banner-scrim-alpha": String(Math.min(MAX_BANNER_OVERLAY, Math.max(0, overlay_opacity)) / 100),
  }) as React.CSSProperties;

/**
 * Places the image like `object-fit: cover`, centered on the focal point and zoomed around it.
 * Pure CSS, so the same framing adapts to the wide desktop banner and the taller phone one.
 */
export const bannerImageStyle = (framing: Pick<HomeBannerFraming, "focal_x" | "focal_y" | "zoom">): React.CSSProperties => {
  const position = `${framing.focal_x}% ${framing.focal_y}%`;
  return {
    objectPosition: position,
    transformOrigin: position,
    transform: framing.zoom === 1 ? undefined : `scale(${framing.zoom})`,
  };
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const clampZoom = (zoom: number): number => Math.round(clamp(zoom, MIN_BANNER_ZOOM, MAX_BANNER_ZOOM) * 100) / 100;

export const clampFocal = (value: number): number => Math.round(clamp(value, 0, 100) * 100) / 100;

/**
 * How many pixels of image hang outside the frame on each axis, the room the focal point can
 * move through. Zero means that axis already fits exactly and dragging along it does nothing.
 */
export const bannerOverflow = (
  image: { width: number; height: number },
  frame: { width: number; height: number },
  zoom: number
): { x: number; y: number } => {
  if (image.width <= 0 || image.height <= 0) return { x: 0, y: 0 };
  const cover_scale = Math.max(frame.width / image.width, frame.height / image.height) * zoom;
  return {
    x: Math.max(0, image.width * cover_scale - frame.width),
    y: Math.max(0, image.height * cover_scale - frame.height),
  };
};

/**
 * Moves the focal point so the image follows the pointer. Dragging right reveals more of the
 * left side, so the focal point moves the opposite way of the pointer.
 */
export const panFocal = (
  framing: Pick<HomeBannerFraming, "focal_x" | "focal_y" | "zoom">,
  image: { width: number; height: number },
  frame: { width: number; height: number },
  delta: { x: number; y: number }
): { focal_x: number; focal_y: number } => {
  const overflow = bannerOverflow(image, frame, framing.zoom);
  return {
    focal_x: overflow.x > 0 ? clampFocal(framing.focal_x - (delta.x / overflow.x) * 100) : framing.focal_x,
    focal_y: overflow.y > 0 ? clampFocal(framing.focal_y - (delta.y / overflow.y) * 100) : framing.focal_y,
  };
};
