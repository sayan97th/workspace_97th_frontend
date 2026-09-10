"use client";
import React from "react";
import { workspace_create_color_palette } from "@/data/workspace-create-data";

export type WorkspaceColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  /** Optional label above the swatches; omit when the caller renders its own. */
  label?: string;
};

const SWATCH_SIZE = 26;

/**
 * Badge color swatch grid shared by the "Add new workspace" dialog
 * ({@link CreateWorkspaceModal}) and any future "Change appearance" surface,
 * mirroring {@link WorkspacePrivacyPicker}'s `{ value, onChange, label }`
 * shape. The last swatch is a native `<input type="color">` trigger (styled
 * as a conic-gradient wheel) so a user isn't limited to the curated palette.
 */
const WorkspaceColorPicker: React.FC<WorkspaceColorPickerProps> = ({
  value,
  onChange,
  label = "Workspace color",
}) => {
  const is_custom_color = !workspace_create_color_palette.some(
    (hex) => hex.toLowerCase() === value.toLowerCase()
  );

  return (
    <div>
      {label && <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">{label}</div>}
      <div className="flex flex-wrap items-center gap-[9px]">
        {workspace_create_color_palette.map((hex) => {
          const is_selected = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Color ${hex}`}
              aria-pressed={is_selected}
              onClick={() => onChange(hex)}
              className="rounded-full transition-transform hover:scale-105"
              style={{
                width: SWATCH_SIZE,
                height: SWATCH_SIZE,
                background: hex,
                boxShadow: is_selected
                  ? "0 0 0 2px var(--color-shell-panel), 0 0 0 4px #2B76E5"
                  : "0 0 0 1px rgba(255,255,255,0.12)",
              }}
            />
          );
        })}

        <span
          className="relative rounded-full transition-transform hover:scale-105"
          style={{
            width: SWATCH_SIZE,
            height: SWATCH_SIZE,
            background:
              "conic-gradient(from 90deg, #E53E2E, #E9A23B, #2FB56B, #2B7FE0, #8A63D2, #DB4C86, #E53E2E)",
            boxShadow: is_custom_color
              ? "0 0 0 2px var(--color-shell-panel), 0 0 0 4px #2B76E5"
              : "0 0 0 1px rgba(255,255,255,0.12)",
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
      </div>
    </div>
  );
};

export default WorkspaceColorPicker;
