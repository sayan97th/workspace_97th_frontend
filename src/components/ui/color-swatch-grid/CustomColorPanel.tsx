"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, EyedropperIcon } from "@/icons/workspace-icons";
import { glyphColorOn, hexToHsv, hsvToHex, parseHexInput, type Hsv } from "@/lib/color-palette";

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Chromium's screen color picker, undefined where the browser has none (Firefox, Safari). */
const getEyeDropper = (): EyeDropperConstructor | undefined =>
  typeof window === "undefined" ? undefined : (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;

const DEFAULT_CUSTOM_COLOR = "#2783c5";
const FINE_STEP = 0.01;
const COARSE_STEP = 0.1;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Where a pointer sits inside an element, as 0 to 1 on both axes. */
const pointerRatio = (event: React.PointerEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
};

export type CustomColorPanelProps = {
  /** The record's current color, shown as "before" in the preview and used as the starting point. */
  initial_hex: string | null | undefined;
  onApply: (hex: string) => void;
  /** Returns to the palette without picking. */
  onBack: () => void;
};

/**
 * The "Custom color" view of {@link ColorSwatchGrid}: a saturation and
 * brightness area, a hue slider, a hex field and (in Chromium) a screen
 * eyedropper. Both sliders work with the pointer and the arrow keys (Shift for
 * bigger steps). The preview shows the current color next to the new one, so
 * the change is clear before Apply.
 */
const CustomColorPanel: React.FC<CustomColorPanelProps> = ({ initial_hex, onApply, onBack }) => {
  const start_hex = parseHexInput(initial_hex ?? "") ?? DEFAULT_CUSTOM_COLOR;
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(start_hex));
  const [hex_draft, setHexDraft] = useState(start_hex.slice(1).toUpperCase());
  const hex_input_ref = useRef<HTMLInputElement>(null);
  const EyeDropper = getEyeDropper();

  const hex = hsvToHex(hsv);
  const draft_hex = parseHexInput(hex_draft);
  const hue_hex = hsvToHex({ hue: hsv.hue, saturation: 1, value: 1 });

  /** Moves the picker, keeping the typed field in sync. */
  const updateHsv = (next: Hsv) => {
    setHsv(next);
    setHexDraft(hsvToHex(next).slice(1).toUpperCase());
  };

  /** A typed or sampled hex moves the picker; grays keep the current hue so the hue slider does not jump. */
  const takeHex = (next_hex: string) => {
    const next = hexToHsv(next_hex);
    setHsv(next.saturation === 0 || next.value === 0 ? { ...next, hue: hsv.hue } : next);
  };

  const apply = () => {
    if (draft_hex) onApply(draft_hex);
  };

  useEffect(() => {
    hex_input_ref.current?.focus({ preventScroll: true });
    hex_input_ref.current?.select();
  }, []);

  // Escape goes back to the palette. Window capture runs before the document level listeners
  // of ColorSwatchPicker and BoardPopover, so their popovers stay open.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onBack();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onBack]);

  const handleAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? COARSE_STEP : FINE_STEP;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { saturation: clamp01(hsv.saturation - step) },
      ArrowRight: { saturation: clamp01(hsv.saturation + step) },
      ArrowUp: { value: clamp01(hsv.value + step) },
      ArrowDown: { value: clamp01(hsv.value - step) },
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    updateHsv({ ...hsv, ...moves[event.key] });
  };

  const handleHueKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    updateHsv({ ...hsv, hue: (hsv.hue + delta + 360) % 360 });
  };

  const pickFromScreen = async () => {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      const sampled_hex = parseHexInput(sRGBHex);
      if (!sampled_hex) return;
      takeHex(sampled_hex);
      setHexDraft(sampled_hex.slice(1).toUpperCase());
    } catch {
      // The person pressed Escape in the eyedropper: nothing to do.
    }
  };

  return (
    <div className="color-custom-panel" data-color-custom-panel>
      <div className="color-custom-panel__header">
        <button type="button" onClick={onBack} className="color-custom-panel__back" aria-label="Back to palette">
          <ChevronLeftIcon size={12} />
        </button>
        <span className="color-custom-panel__title">Custom color</span>
        {EyeDropper && (
          <button
            type="button"
            onClick={pickFromScreen}
            className="color-custom-panel__icon-button"
            aria-label="Pick a color from the screen"
            title="Pick from screen"
          >
            <EyedropperIcon size={14} />
          </button>
        )}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.saturation * 100)}
        aria-valuetext={`Saturation ${Math.round(hsv.saturation * 100)}%, brightness ${Math.round(hsv.value * 100)}%`}
        className="color-custom-panel__area"
        style={{ "--color-custom-hue": hue_hex } as React.CSSProperties}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const { x, y } = pointerRatio(event);
          updateHsv({ ...hsv, saturation: x, value: 1 - y });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const { x, y } = pointerRatio(event);
          updateHsv({ ...hsv, saturation: x, value: 1 - y });
        }}
        onKeyDown={handleAreaKeyDown}
      >
        <span
          className="color-custom-panel__thumb"
          style={{ left: `${hsv.saturation * 100}%`, top: `${(1 - hsv.value) * 100}%`, background: hex }}
        />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.hue)}
        className="color-custom-panel__hue"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHsv({ ...hsv, hue: Math.min(359.9, pointerRatio(event).x * 360) });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          updateHsv({ ...hsv, hue: Math.min(359.9, pointerRatio(event).x * 360) });
        }}
        onKeyDown={handleHueKeyDown}
      >
        <span className="color-custom-panel__thumb color-custom-panel__thumb--hue" style={{ left: `${(hsv.hue / 360) * 100}%`, background: hue_hex }} />
      </div>

      {/* Not a <form>: the picker often sits inside one (workspace dialogs), and forms cannot nest. */}
      <div className="color-custom-panel__footer">
        <span className="color-custom-panel__preview" aria-hidden="true">
          {initial_hex && <span style={{ background: initial_hex }} title="Current" />}
          <span style={{ background: draft_hex ?? hex }} title="New" />
        </span>
        <label className="color-custom-panel__field" data-invalid={!draft_hex || undefined}>
          <span aria-hidden="true">#</span>
          <input
            ref={hex_input_ref}
            value={hex_draft}
            onChange={(event) => {
              const typed = event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
              setHexDraft(typed);
              const typed_hex = parseHexInput(typed);
              if (typed_hex) takeHex(typed_hex);
            }}
            onPaste={(event) => {
              const pasted_hex = parseHexInput(event.clipboardData.getData("text"));
              if (!pasted_hex) return;
              event.preventDefault();
              setHexDraft(pasted_hex.slice(1).toUpperCase());
              takeHex(pasted_hex);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              apply();
            }}
            aria-label="Hex color"
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
          />
        </label>
        <button
          type="button"
          onClick={apply}
          disabled={!draft_hex}
          className="color-custom-panel__apply"
          style={draft_hex ? ({ "--color-custom-apply": draft_hex, "--color-custom-apply-text": glyphColorOn(draft_hex) } as React.CSSProperties) : undefined}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default CustomColorPanel;
