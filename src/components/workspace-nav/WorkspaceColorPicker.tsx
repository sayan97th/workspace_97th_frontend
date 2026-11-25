"use client";
import React from "react";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";
import { workspace_create_color_palette } from "@/data/workspace-create-data";
import { isSameColor } from "@/lib/color-palette";

export type WorkspaceColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  /** Optional label above the swatches; omit when the caller renders its own. */
  label?: string;
};

const CUSTOM_SWATCH_SIZE = 22;

/**
 * Badge color picker shared by the "Add new workspace" dialog
 * ({@link CreateWorkspaceModal}) and any future "Change appearance" surface,
 * mirroring {@link WorkspacePrivacyPicker}'s `{ value, onChange, label }`
 * shape. Offers Tonk's palette through {@link ColorSwatchGrid}, plus a native
 * `<input type="color">` (styled as a conic-gradient wheel) so a user isn't
 * limited to the curated palette.
 */
const WorkspaceColorPicker: React.FC<WorkspaceColorPickerProps> = ({
  value,
  onChange,
  label = "Workspace color",
}) => {
  const is_custom_color = !workspace_create_color_palette.some((hex) => isSameColor(hex, value));

  return (
    <div>
      {label && <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">{label}</div>}
      <ColorSwatchGrid
        value={value}
        onSelect={onChange}
        aria_label={label || "Workspace color"}
        className="[--color-swatch-grid-surface:var(--color-shell-panel)] [--color-swatch-grid-ring:var(--color-shell-text)] [--color-swatch-grid-text:var(--color-shell-text)] [--color-swatch-grid-text-muted:var(--color-shell-text-muted)]"
      />
      <label
        className="mt-2.5 inline-flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
      >
        <span
          className="relative flex-none rounded-full"
          style={{
            width: CUSTOM_SWATCH_SIZE,
            height: CUSTOM_SWATCH_SIZE,
            background: "conic-gradient(from 90deg, #e53e2e, #e29703, #60943f, #0499b1, #2783c5, #9a7ab6, #e697b2, #e53e2e)",
            boxShadow: is_custom_color
              ? "0 0 0 2px var(--color-shell-panel), 0 0 0 4px var(--color-shell-text)"
              : undefined,
          }}
        >
          <input
            type="color"
            aria-label="Choose a custom workspace color"
            value={is_custom_color ? value : "#ffffff"}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
          />
        </span>
        Custom color
      </label>
    </div>
  );
};

export default WorkspaceColorPicker;
