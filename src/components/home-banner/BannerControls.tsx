"use client";
import React, { useId } from "react";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import type { HomeBannerFraming, HomeBannerTextTone } from "@/types/home-banner";
import {
  BANNER_GRADIENT_PRESETS,
  MAX_BANNER_OVERLAY,
  MAX_BANNER_ZOOM,
  MIN_BANNER_ZOOM,
  clampZoom,
  type ResolvedTextTone,
} from "./bannerFraming";

/** The nine anchor points of the Position grid, a quick alternative to dragging. */
const FOCUS_ANCHORS = [0, 50, 100].flatMap((focal_y) => [0, 50, 100].map((focal_x) => ({ focal_x, focal_y })));

const anchorLabel = (focal_x: number, focal_y: number): string => {
  const vertical = focal_y === 0 ? "top" : focal_y === 100 ? "bottom" : "middle";
  const horizontal = focal_x === 0 ? "left" : focal_x === 100 ? "right" : "center";
  return vertical === "middle" && horizontal === "center" ? "center" : `${vertical} ${horizontal}`;
};

const TONE_OPTIONS: { value: HomeBannerTextTone; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const PRESET_COLORS = new Set(BANNER_GRADIENT_PRESETS.map((preset) => preset.color));

type BannerControlsProps = {
  framing: HomeBannerFraming;
  /** What `auto` turned into for this image. */
  resolved_tone: ResolvedTextTone;
  onChange: (framing: Partial<HomeBannerFraming>) => void;
  onReset: () => void;
};

/** One labeled group of the panel, with its current value on the right. */
const ControlSection: React.FC<{ label: string; value?: React.ReactNode; html_for?: string; children: React.ReactNode }> = ({
  label,
  value,
  html_for,
  children,
}) => (
  <div className="hb-section">
    <div className="hb-section-head">
      {html_for ? (
        <label htmlFor={html_for} className="hb-section-label">
          {label}
        </label>
      ) : (
        <span className="hb-section-label">{label}</span>
      )}
      {value !== undefined ? <span className="hb-section-value">{value}</span> : null}
    </div>
    {children}
  </div>
);

const RangeInput: React.FC<{
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  fill_color?: string;
}> = ({ id, min, max, step, value, onChange, fill_color }) => (
  <input
    id={id}
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(event) => onChange(Number(event.target.value))}
    className="hb-range"
    style={
      {
        "--range-fill": `${((value - min) / (max - min)) * 100}%`,
        "--range-color": fill_color,
      } as React.CSSProperties
    }
  />
);

/** Zoom, position, text color and the gradient. Every change shows in the preview right away. */
const BannerControls: React.FC<BannerControlsProps> = ({ framing, resolved_tone, onChange, onReset }) => {
  const zoom_id = useId();
  const strength_id = useId();
  const custom_color_id = useId();
  const custom_color = framing.overlay_color && !PRESET_COLORS.has(framing.overlay_color) ? framing.overlay_color : null;

  return (
    <div className="hb-controls">
      <ControlSection label="Zoom" value={`${framing.zoom.toFixed(1)}x`} html_for={zoom_id}>
        <div className="hb-zoom-row">
          <button
            type="button"
            className="hb-icon-button"
            onClick={() => onChange({ zoom: clampZoom(framing.zoom - 0.1) })}
            disabled={framing.zoom <= MIN_BANNER_ZOOM}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <RangeInput
            id={zoom_id}
            min={MIN_BANNER_ZOOM}
            max={MAX_BANNER_ZOOM}
            step={0.01}
            value={framing.zoom}
            onChange={(zoom) => onChange({ zoom: clampZoom(zoom) })}
          />
          <button
            type="button"
            className="hb-icon-button"
            onClick={() => onChange({ zoom: clampZoom(framing.zoom + 0.1) })}
            disabled={framing.zoom >= MAX_BANNER_ZOOM}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </ControlSection>

      <ControlSection label="Position">
        <div className="hb-position-row">
          <div className="hb-anchor-grid" role="group" aria-label="Position">
            {FOCUS_ANCHORS.map((anchor) => {
              const is_active = Math.abs(framing.focal_x - anchor.focal_x) < 1 && Math.abs(framing.focal_y - anchor.focal_y) < 1;
              return (
                <button
                  key={`${anchor.focal_x}-${anchor.focal_y}`}
                  type="button"
                  className="hb-anchor"
                  aria-pressed={is_active}
                  aria-label={`Show the ${anchorLabel(anchor.focal_x, anchor.focal_y)}`}
                  title={anchorLabel(anchor.focal_x, anchor.focal_y)}
                  onClick={() => onChange(anchor)}
                />
              );
            })}
          </div>
          <p className="hb-hint">Or drag the image.</p>
        </div>
      </ControlSection>

      <ControlSection label="Text">
        <div className="hb-segmented" role="radiogroup" aria-label="Text color">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={framing.text_tone === option.value}
              className="hb-segment"
              onClick={() => onChange({ text_tone: option.value })}
            >
              <span className="hb-tone-chip" data-tone={option.value === "auto" ? resolved_tone : option.value} aria-hidden="true">
                Aa
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </ControlSection>

      <ControlSection label="Gradient" value={`${framing.overlay_opacity}%`} html_for={strength_id}>
        <div className="hb-swatches" role="radiogroup" aria-label="Gradient color">
          <button
            type="button"
            role="radio"
            aria-checked={framing.overlay_color === null}
            className="hb-swatch hb-swatch-auto"
            title="Auto"
            aria-label="Automatic color"
            onClick={() => onChange({ overlay_color: null })}
          >
            <Check className="hb-swatch-check" aria-hidden="true" />
          </button>
          {BANNER_GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.color}
              type="button"
              role="radio"
              aria-checked={framing.overlay_color === preset.color}
              className="hb-swatch"
              title={preset.label}
              aria-label={preset.label}
              style={{ "--swatch": preset.color } as React.CSSProperties}
              data-light={preset.color === "#fafaf5" || preset.color === "#ecaa17" || undefined}
              onClick={() => onChange({ overlay_color: preset.color })}
            >
              <Check className="hb-swatch-check" aria-hidden="true" />
            </button>
          ))}
          <label
            htmlFor={custom_color_id}
            className="hb-swatch hb-swatch-custom"
            title="Custom color"
            data-has-color={custom_color !== null || undefined}
            style={custom_color ? ({ "--swatch": custom_color } as React.CSSProperties) : undefined}
          >
            <input
              id={custom_color_id}
              type="color"
              className="sr-only"
              aria-label="Custom gradient color"
              value={custom_color ?? "#546264"}
              onChange={(event) => onChange({ overlay_color: event.target.value.toLowerCase() })}
            />
            <Check className="hb-swatch-check" aria-hidden="true" />
          </label>
        </div>
        <RangeInput
          id={strength_id}
          min={0}
          max={MAX_BANNER_OVERLAY}
          step={1}
          value={framing.overlay_opacity}
          onChange={(overlay_opacity) => onChange({ overlay_opacity })}
          fill_color={framing.overlay_color ?? undefined}
        />
      </ControlSection>

      <button type="button" className="hb-link-button" onClick={onReset}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Reset
      </button>
    </div>
  );
};

export default BannerControls;
