"use client";
import React, { useMemo } from "react";
import { AlertTriangle, Check, CircleCheck, Palette, RotateCcw } from "lucide-react";
import {
  DEFAULT_BRAND_COLOR,
  MIN_BUTTON_CONTRAST,
  buildBrandPalette,
  contrastWithWhite,
  isHexColor,
} from "@/lib/brand-theme";
import { Field, OrganizationCard, input_class } from "../organization-fields";
import type { OrganizationSectionProps } from "./section-props";

/** Curated colors that all keep white button text readable. */
const PRESET_COLORS: { label: string; hex: string }[] = [
  { label: "97th Floor red", hex: DEFAULT_BRAND_COLOR },
  { label: "Ocean blue", hex: "#0073ea" },
  { label: "Indigo", hex: "#5559df" },
  { label: "Royal purple", hex: "#784bd1" },
  { label: "Berry", hex: "#c2255c" },
  { label: "Sunset orange", hex: "#d9480f" },
  { label: "Forest green", hex: "#00854d" },
  { label: "Teal", hex: "#0b7285" },
  { label: "Navy", hex: "#1f3a8a" },
  { label: "Graphite", hex: "#323338" },
];

const PALETTE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];

/** The brand color that repaints buttons, links, badges and highlights across the whole app. */
const BrandColorCard: React.FC<OrganizationSectionProps> = ({ draft, field_errors, setField, is_read_only }) => {
  const typed_color = draft.brand_color.trim().toLowerCase();
  const effective_color = isHexColor(typed_color) ? typed_color : DEFAULT_BRAND_COLOR;
  const palette = useMemo(() => buildBrandPalette(effective_color), [effective_color]);
  const contrast_ratio = contrastWithWhite(effective_color);
  const is_default = effective_color === DEFAULT_BRAND_COLOR;

  const contrast_status =
    contrast_ratio >= 4.5
      ? { icon: CircleCheck, text: "Great contrast, white text reads well on it.", class_name: "text-[#00854d]" }
      : contrast_ratio >= MIN_BUTTON_CONTRAST
        ? { icon: CircleCheck, text: "Good enough for buttons and bold labels.", class_name: "text-[#00854d]" }
        : {
            icon: AlertTriangle,
            text: "Too light, white text on buttons will be hard to read. Pick a darker shade.",
            class_name: "text-[#b25e00]",
          };
  const ContrastIcon = contrast_status.icon;

  return (
    <OrganizationCard
      id="colors"
      icon={Palette}
      title="Brand color"
      description="Repaints buttons, links, badges and highlights for everyone. Status and label colors on boards keep their own colors."
      aside={
        !is_default && !is_read_only ? (
          <button
            type="button"
            onClick={() => setField("brand_color", "")}
            className="inline-flex h-8 flex-none items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset to default
          </button>
        ) : null
      }
    >
      <div className="mb-2 text-[13px] font-semibold text-shell-text">Presets</div>
      <div className="mb-5 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Brand color presets">
        {PRESET_COLORS.map((preset) => {
          const is_selected = effective_color === preset.hex;
          return (
            <button
              key={preset.hex}
              type="button"
              role="radio"
              aria-checked={is_selected}
              aria-label={preset.label}
              title={preset.label}
              disabled={is_read_only}
              onClick={() => setField("brand_color", preset.hex === DEFAULT_BRAND_COLOR ? "" : preset.hex)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-shell-panel transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                is_selected ? "ring-2 ring-shell-text" : ""
              }`}
              style={{ backgroundColor: preset.hex }}
            >
              {is_selected ? <Check className="h-4 w-4 text-white" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr]">
        <Field label="Custom color" hint="Any hex color, e.g. #0073ea." error={field_errors.brand_color}>
          {(input_props) => (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={effective_color}
                onChange={(event) => setField("brand_color", event.target.value)}
                disabled={is_read_only}
                aria-label="Pick a custom brand color"
                className="h-10 w-12 flex-none cursor-pointer rounded-md border border-shell-border-strong bg-shell-panel p-1 disabled:cursor-not-allowed"
              />
              <input
                {...input_props}
                type="text"
                value={draft.brand_color}
                onChange={(event) => setField("brand_color", event.target.value)}
                maxLength={7}
                spellCheck={false}
                className={`${input_class} font-mono uppercase`}
                placeholder={DEFAULT_BRAND_COLOR}
              />
            </div>
          )}
        </Field>

        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-shell-text">Generated shades</div>
          <div className="flex h-10 overflow-hidden rounded-md border border-shell-border" aria-hidden="true">
            {PALETTE_STEPS.map((step) => (
              <span
                key={step}
                className="flex-1"
                style={{ backgroundColor: palette[`--color-brand-${step}`] }}
                title={`${step}: ${palette[`--color-brand-${step}`]}`}
              />
            ))}
          </div>
          <p className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${contrast_status.class_name}`}>
            <ContrastIcon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span>
              Contrast {contrast_ratio.toFixed(1)}:1. {contrast_status.text}
            </span>
          </p>
        </div>
      </div>

      {/* Samples painted with the draft palette, before it is saved. */}
      <div
        className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-shell-panel-alt px-4 py-3.5"
        style={palette as React.CSSProperties}
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-shell-text-faint">Sample</span>
        <span className="inline-flex h-8 items-center rounded-md bg-brand-500 px-3.5 text-[13px] font-semibold text-white">
          Primary button
        </span>
        <span className="inline-flex h-8 items-center rounded-md border border-brand-500 px-3.5 text-[13px] font-semibold text-brand-500">
          Secondary
        </span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-700">New</span>
        <span className="text-[13px] font-semibold text-brand-500 underline underline-offset-2">A link</span>
      </div>
    </OrganizationCard>
  );
};

export default BrandColorCard;
