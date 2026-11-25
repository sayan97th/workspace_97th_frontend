"use client";
import React, { useEffect, useRef, useState } from "react";
import { HomeHeroGreeting, type HomeHeroGreetingProps } from "@/components/home/HomeHero";
import type { HomeBannerFraming } from "@/types/home-banner";
import HomeBannerImage, { type BannerImageSource } from "./HomeBannerImage";
import { bannerOverflow, clampZoom, panFocal, resolveTextTone } from "./bannerFraming";
import "@/components/home/home.css";
import "./home-banner.css";

export type BannerDeviceId = "desktop" | "tablet" | "phone";

/** The hero's real size on each screen, so previews show exactly what people will see. */
export const BANNER_DEVICES: { id: BannerDeviceId; label: string; width: number; height: number }[] = [
  { id: "desktop", label: "Desktop", width: 1216, height: 200 },
  { id: "tablet", label: "Tablet", width: 704, height: 200 },
  { id: "phone", label: "Phone", width: 343, height: 240 },
];

export type BannerPreviewImage = BannerImageSource & { width: number; height: number; luminance: number };

type BannerFrameProps = {
  device: BannerDeviceId;
  image: BannerPreviewImage;
  framing: HomeBannerFraming;
  greeting: HomeHeroGreetingProps;
  /** Largest width the frame may take on screen, it is scaled down to fit. */
  max_width: number;
  /** Largest height on screen, keeps the tall phone frame from towering over the dialog. */
  max_height?: number;
  show_guides?: boolean;
  /** Main stage only: drag to move, wheel to zoom, arrow keys to nudge. */
  onFramingChange?: (framing: Partial<HomeBannerFraming>) => void;
  onDragStateChange?: (is_dragging: boolean) => void;
};

const deviceSize = (device: BannerDeviceId) => BANNER_DEVICES.find((item) => item.id === device) ?? BANNER_DEVICES[0];

/**
 * One device sized copy of the Home hero with the banner, drawn at its real pixel size and scaled
 * down with a transform. The greeting is the hero's own component, so fonts, spacing and the
 * light or dark text match the live page.
 */
const BannerFrame: React.FC<BannerFrameProps> = ({
  device,
  image,
  framing,
  greeting,
  max_width,
  max_height = Infinity,
  show_guides = false,
  onFramingChange,
  onDragStateChange,
}) => {
  const size = deviceSize(device);
  const scale = Math.min(1, max_width / size.width, max_height / size.height);
  const tone = resolveTextTone(framing.text_tone, image.luminance, framing.overlay_opacity, framing.overlay_color);
  const is_interactive = Boolean(onFramingChange);
  const frame_ref = useRef<HTMLDivElement>(null);
  const drag_ref = useRef<{ pointer_id: number; x: number; y: number; framing: HomeBannerFraming } | null>(null);
  const [is_dragging, setIsDragging] = useState(false);
  const overflow = bannerOverflow(image, size, framing.zoom);
  const can_pan = overflow.x > 0.5 || overflow.y > 0.5;

  const latest = useRef({ framing, onFramingChange });
  useEffect(() => {
    latest.current = { framing, onFramingChange };
  }, [framing, onFramingChange]);

  // Wheel zoom needs a non passive listener to keep the dialog from scrolling.
  useEffect(() => {
    const frame = frame_ref.current;
    if (!frame || !is_interactive) return;
    const zoomOnWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { framing: current, onFramingChange: change } = latest.current;
      change?.({ zoom: clampZoom(current.zoom * (event.deltaY < 0 ? 1.06 : 1 / 1.06)) });
    };
    frame.addEventListener("wheel", zoomOnWheel, { passive: false });
    return () => frame.removeEventListener("wheel", zoomOnWheel);
  }, [is_interactive]);

  const endDrag = () => {
    drag_ref.current = null;
    setIsDragging(false);
    onDragStateChange?.(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onFramingChange) return;
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, Partial<HomeBannerFraming>> = {
      ArrowLeft: { focal_x: Math.max(0, framing.focal_x - step) },
      ArrowRight: { focal_x: Math.min(100, framing.focal_x + step) },
      ArrowUp: { focal_y: Math.max(0, framing.focal_y - step) },
      ArrowDown: { focal_y: Math.min(100, framing.focal_y + step) },
      "+": { zoom: clampZoom(framing.zoom + 0.1) },
      "=": { zoom: clampZoom(framing.zoom + 0.1) },
      "-": { zoom: clampZoom(framing.zoom - 0.1) },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      onFramingChange(move);
    }
  };

  return (
    <div className="home-banner-frame-shell" style={{ width: size.width * scale, height: size.height * scale }}>
      <div
        ref={frame_ref}
        className="home-theme home-banner-frame"
        data-device={device}
        data-interactive={is_interactive || undefined}
        data-dragging={is_dragging || undefined}
        data-can-pan={can_pan || undefined}
        style={{ width: size.width, height: size.height, transform: scale === 1 ? undefined : `scale(${scale})` }}
        tabIndex={is_interactive ? 0 : undefined}
        role={is_interactive ? "application" : undefined}
        aria-label={is_interactive ? "Banner preview. Drag or use the arrow keys to move the image, plus and minus to zoom." : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (!onFramingChange || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag_ref.current = { pointer_id: event.pointerId, x: event.clientX, y: event.clientY, framing };
          setIsDragging(true);
          onDragStateChange?.(true);
        }}
        onPointerMove={(event) => {
          const drag = drag_ref.current;
          if (!drag || drag.pointer_id !== event.pointerId || !onFramingChange) return;
          // Pointer moves are in screen pixels, the frame is scaled, so convert back to frame pixels.
          const delta = { x: (event.clientX - drag.x) / scale, y: (event.clientY - drag.y) / scale };
          onFramingChange(panFocal(drag.framing, image, size, delta));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => drag_ref.current && endDrag()}
      >
        <section className="home-hero" data-has-image data-tone={tone}>
          <HomeBannerImage source={image} framing={framing} tone={tone} sizes={`${Math.round(size.width * scale)}px`} is_interactive={is_dragging} />
          <HomeHeroGreeting {...greeting} />
        </section>

        {show_guides || is_dragging ? (
          <div className="home-banner-guides" aria-hidden="true">
            <span className="home-banner-guide-text-zone">
              <span className="home-banner-guide-label">Text area</span>
            </span>
            <span className="home-banner-guide-line" style={{ left: "33.333%" }} data-axis="x" />
            <span className="home-banner-guide-line" style={{ left: "66.666%" }} data-axis="x" />
            <span className="home-banner-guide-line" style={{ top: "33.333%" }} data-axis="y" />
            <span className="home-banner-guide-line" style={{ top: "66.666%" }} data-axis="y" />
            <span className="home-banner-focal" style={{ left: `${framing.focal_x}%`, top: `${framing.focal_y}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BannerFrame;
