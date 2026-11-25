"use client";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, PlusIcon } from "@/icons/workspace-icons";
import {
  PALETTE_SWATCHES,
  findPaletteSwatch,
  glyphColorOn,
  isSameColor,
  type PaletteSwatch,
} from "@/lib/color-palette";
import {
  emptyRecentCustomColorsSnapshot,
  parseRecentCustomColors,
  recentCustomColorsSnapshot,
  rememberCustomColor,
  subscribeRecentCustomColors,
} from "@/lib/recent-custom-colors";
import CustomColorPanel from "./CustomColorPanel";
import "./color-swatch-grid.scss";

export type ColorSwatchGridSize = "sm" | "md" | "lg";

export type ColorSwatchGridProps = {
  /** The record's current color; marked with a check when it is in the palette. */
  value: string | null | undefined;
  onSelect: (hex: string) => void;
  /** Swatches offered. Defaults to the app palette, {@link PALETTE_SWATCHES}. */
  swatches?: readonly PaletteSwatch[];
  /** Swatches per row. Defaults to 6, the palette's own layout. */
  columns?: number;
  /** sm 22px, md 26px (default), lg 30px. */
  size?: ColorSwatchGridSize;
  /** Shows the hovered (or current) color's name and hex under the grid. */
  show_caption?: boolean;
  /** Accessible name of the swatch group, e.g. "Label color". */
  aria_label?: string;
  disabled?: boolean;
  /** Focuses the current swatch (or the first one) on mount, for grids opened from a trigger. */
  auto_focus?: boolean;
  /** Offers "Custom color" (any hex, plus this browser's recent custom colors). Defaults to true. */
  allow_custom?: boolean;
  className?: string;
};

/**
 * The palette swatch grid every color choice in the app is made with: rounded
 * squares in the palette's 6 by 3 layout, a check on the current color, and a caption
 * naming the hovered color. Keyboard friendly as a radio group: one tab stop,
 * arrow keys move across rows and columns, Enter or Space picks.
 *
 * It draws no card of its own, so it drops into a popover (ColorSwatchPicker),
 * a menu flyout (group color) or an inline form field (form accent color).
 */
const ColorSwatchGrid: React.FC<ColorSwatchGridProps> = ({
  value,
  onSelect,
  swatches = PALETTE_SWATCHES,
  columns = 6,
  size = "md",
  show_caption = true,
  aria_label = "Colors",
  disabled = false,
  auto_focus = false,
  allow_custom = true,
  className,
}) => {
  const swatch_refs = useRef<(HTMLButtonElement | null)[]>([]);
  const custom_trigger_ref = useRef<HTMLButtonElement>(null);
  const [preview_hex, setPreviewHex] = useState<string | null>(null);
  const [is_custom_open, setIsCustomOpen] = useState(false);

  const recent_snapshot = useSyncExternalStore(
    subscribeRecentCustomColors,
    recentCustomColorsSnapshot,
    emptyRecentCustomColorsSnapshot
  );
  // Palette first, then this browser's recent custom colors as one more row, one roving tab stop across both.
  const all_swatches = useMemo<PaletteSwatch[]>(() => {
    if (!allow_custom) return [...swatches];
    const recent_swatches = parseRecentCustomColors(recent_snapshot)
      .filter((hex) => !swatches.some((swatch) => isSameColor(swatch.hex, hex)))
      .map((hex) => ({ hex, name: "Custom" }));
    return [...swatches, ...recent_swatches];
  }, [allow_custom, recent_snapshot, swatches]);

  const current_index = all_swatches.findIndex((swatch) => isSameColor(swatch.hex, value));
  const tab_index = current_index >= 0 ? current_index : 0;
  const is_custom_value = !!value && current_index < 0;

  const caption_swatch = preview_hex ? all_swatches.find((swatch) => swatch.hex === preview_hex) ?? findPaletteSwatch(preview_hex) : null;
  const current_swatch = current_index >= 0 ? all_swatches[current_index] : null;
  const caption = caption_swatch ?? current_swatch ?? (value ? { hex: value.toLowerCase(), name: "Custom" } : null);

  useEffect(() => {
    if (!auto_focus) return;
    // Next frame: a portaled host (ColorSwatchPicker) is still hidden while it measures its position.
    const frame = requestAnimationFrame(() => swatch_refs.current[tab_index]?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
    // Only on mount: later value changes must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusSwatch = (index: number) => {
    const clamped_index = Math.max(0, Math.min(all_swatches.length - 1, index));
    swatch_refs.current[clamped_index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns,
      ArrowUp: index - columns,
      Home: 0,
      End: all_swatches.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    event.stopPropagation();
    focusSwatch(moves[event.key]);
  };

  const renderSwatch = (swatch: PaletteSwatch, index: number) => {
    const is_current = index === current_index;
    return (
      <button
        key={swatch.hex}
        ref={(element) => {
          swatch_refs.current[index] = element;
        }}
        type="button"
        role="radio"
        aria-checked={is_current}
        aria-label={`${swatch.name}, ${swatch.hex}`}
        tabIndex={index === tab_index ? 0 : -1}
        disabled={disabled}
        onClick={() => onSelect(swatch.hex)}
        onKeyDown={(event) => handleKeyDown(event, index)}
        onMouseEnter={() => setPreviewHex(swatch.hex)}
        onFocus={() => setPreviewHex(swatch.hex)}
        className="color-swatch-grid__swatch"
        style={
          {
            "--color-swatch": swatch.hex,
            "--color-swatch-glyph": glyphColorOn(swatch.hex),
          } as React.CSSProperties
        }
      >
        {is_current && <CheckIcon size={size === "sm" ? 10 : 12} />}
      </button>
    );
  };

  const recent_offset = swatches.length;
  const has_recent = all_swatches.length > recent_offset;

  return (
    <div
      className={`color-swatch-grid color-swatch-grid--${size}${className ? ` ${className}` : ""}`}
      style={{ "--color-swatch-grid-columns": columns } as React.CSSProperties}
      data-view={is_custom_open ? "custom" : "palette"}
      onMouseLeave={() => setPreviewHex(null)}
    >
      {is_custom_open ? (
        <CustomColorPanel
          initial_hex={value}
          onApply={(hex) => {
            rememberCustomColor(hex);
            setIsCustomOpen(false);
            onSelect(hex);
          }}
          onBack={() => {
            setIsCustomOpen(false);
            requestAnimationFrame(() => custom_trigger_ref.current?.focus({ preventScroll: true }));
          }}
        />
      ) : (
        <>
          <div role="radiogroup" aria-label={aria_label} aria-disabled={disabled || undefined} className="color-swatch-grid__groups">
            <div className="color-swatch-grid__swatches">{swatches.map((swatch, index) => renderSwatch(swatch, index))}</div>
            {has_recent && (
              <div className="color-swatch-grid__recent">
                <span className="color-swatch-grid__label">Recent</span>
                <div className="color-swatch-grid__swatches">
                  {all_swatches.slice(recent_offset).map((swatch, index) => renderSwatch(swatch, recent_offset + index))}
                </div>
              </div>
            )}
          </div>

          {(show_caption || allow_custom) && (
            <div className="color-swatch-grid__footer">
              {show_caption && (
                <div className="color-swatch-grid__caption" aria-live="polite">
                  {caption ? (
                    <>
                      <span className="color-swatch-grid__caption-dot" style={{ background: caption.hex }} />
                      <span className="color-swatch-grid__caption-name">{caption.name}</span>
                      <span className="color-swatch-grid__caption-hex">{caption.hex.replace("#", "").toUpperCase()}</span>
                    </>
                  ) : (
                    <span className="color-swatch-grid__caption-name color-swatch-grid__caption-name--muted">Pick a color</span>
                  )}
                </div>
              )}
              {allow_custom && (
                <button
                  ref={custom_trigger_ref}
                  type="button"
                  disabled={disabled}
                  onClick={() => setIsCustomOpen(true)}
                  onMouseEnter={() => setPreviewHex(null)}
                  aria-label="Custom color"
                  title="Custom color"
                  data-active={is_custom_value || undefined}
                  className="color-swatch-grid__custom"
                >
                  <span
                    className="color-swatch-grid__custom-core"
                    style={is_custom_value ? { background: value ?? undefined, color: glyphColorOn(value!) } : undefined}
                  >
                    <PlusIcon size={10} />
                  </span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ColorSwatchGrid;
