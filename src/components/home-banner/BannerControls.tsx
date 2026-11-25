"use client";
import React, { useId } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { HomeBannerFraming, HomeBannerTextTone } from "@/types/home-banner";
import { MAX_BANNER_OVERLAY, MAX_BANNER_ZOOM, MIN_BANNER_ZOOM, clampZoom, type ResolvedTextTone } from "./bannerFraming";

/** The nine anchor points of the "Focus" grid, a quick alternative to dragging. */
const FOCUS_ANCHORS = [0, 50, 100].flatMap((focal_y) => [0, 50, 100].map((focal_x) => ({ focal_x, focal_y })));

const anchorLabel = (focal_x: number, focal_y: number): string => {
  const vertical = focal_y === 0 ? "top" : focal_y === 100 ? "bottom" : "middle";
  const horizontal = focal_x === 0 ? "left" : focal_x === 100 ? "right" : "center";
  return vertical === "middle" && horizontal === "center" ? "Center" : `${vertical} ${horizontal}`;
};

const TONE_OPTIONS: { value: HomeBannerTextTone; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type BannerControlsProps = {
  framing: HomeBannerFraming;
  /** What `auto` turned into for this image, shown next to the option. */
  resolved_tone: ResolvedTextTone;
  onChange: (framing: Partial<HomeBannerFraming>) => void;
  onReset: () => void;
};

/** Zoom, focus point, greeting color and shade. Every change shows in the previews at once. */
const BannerControls: React.FC<BannerControlsProps> = ({ framing, resolved_tone, onChange, onReset }) => {
  const zoom_id = useId();
  const overlay_id = useId();
  const zoom_percent = ((framing.zoom - MIN_BANNER_ZOOM) / (MAX_BANNER_ZOOM - MIN_BANNER_ZOOM)) * 100;
  const overlay_percent = (framing.overlay_opacity / MAX_BANNER_OVERLAY) * 100;

  return (
    <div className="home-banner-controls">
      <div className="home-banner-control">
        <div className="home-banner-control-head">
          <label htmlFor={zoom_id} className="home-banner-control-label">
            Zoom
          </label>
          <span className="home-banner-control-value">{framing.zoom.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="home-banner-icon-button"
            onClick={() => onChange({ zoom: clampZoom(framing.zoom - 0.1) })}
            disabled={framing.zoom <= MIN_BANNER_ZOOM}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <input
            id={zoom_id}
            type="range"
            min={MIN_BANNER_ZOOM}
            max={MAX_BANNER_ZOOM}
            step={0.01}
            value={framing.zoom}
            onChange={(event) => onChange({ zoom: clampZoom(Number(event.target.value)) })}
            className="home-banner-range"
            style={{ "--range-fill": `${zoom_percent}%` } as React.CSSProperties}
          />
          <button
            type="button"
            className="home-banner-icon-button"
            onClick={() => onChange({ zoom: clampZoom(framing.zoom + 0.1) })}
            disabled={framing.zoom >= MAX_BANNER_ZOOM}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="home-banner-control">
        <div className="home-banner-control-head">
          <span className="home-banner-control-label">Focus</span>
          <span className="home-banner-control-value">
            {Math.round(framing.focal_x)}%, {Math.round(framing.focal_y)}%
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="home-banner-anchor-grid" role="group" aria-label="Focus point">
            {FOCUS_ANCHORS.map((anchor) => {
              const is_active = Math.abs(framing.focal_x - anchor.focal_x) < 1 && Math.abs(framing.focal_y - anchor.focal_y) < 1;
              return (
                <button
                  key={`${anchor.focal_x}-${anchor.focal_y}`}
                  type="button"
                  className="home-banner-anchor"
                  aria-pressed={is_active}
                  aria-label={`Focus ${anchorLabel(anchor.focal_x, anchor.focal_y)}`}
                  onClick={() => onChange(anchor)}
                />
              );
            })}
          </div>
          <p className="home-banner-control-hint">Drag the image, or use the arrow keys, to choose the part that shows.</p>
        </div>
      </div>

      <div className="home-banner-control">
        <div className="home-banner-control-head">
          <span className="home-banner-control-label">Greeting text</span>
          {framing.text_tone === "auto" ? (
            <span className="home-banner-control-value">Using {resolved_tone}</span>
          ) : null}
        </div>
        <div className="home-banner-segmented" role="radiogroup" aria-label="Greeting text color">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={framing.text_tone === option.value}
              className="home-banner-segment"
              onClick={() => onChange({ text_tone: option.value })}
            >
              <span className="home-banner-tone-swatch" data-tone={option.value === "auto" ? resolved_tone : option.value} aria-hidden="true">
                Aa
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="home-banner-control">
        <div className="home-banner-control-head">
          <label htmlFor={overlay_id} className="home-banner-control-label">
            Shade
          </label>
          <span className="home-banner-control-value">{framing.overlay_opacity}%</span>
        </div>
        <input
          id={overlay_id}
          type="range"
          min={0}
          max={MAX_BANNER_OVERLAY}
          step={1}
          value={framing.overlay_opacity}
          onChange={(event) => onChange({ overlay_opacity: Number(event.target.value) })}
          className="home-banner-range"
          style={{ "--range-fill": `${overlay_percent}%` } as React.CSSProperties}
        />
        <p className="home-banner-control-hint">Darkens (or lightens) the image behind the greeting so it stays easy to read.</p>
      </div>

      <button type="button" className="home-banner-link-button" onClick={onReset}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Reset position and style
      </button>
    </div>
  );
};

export default BannerControls;
