"use client";
import React from "react";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";

export type WorkspaceColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  /** Optional label above the swatches; omit when the caller renders its own. */
  label?: string;
};

/**
 * Badge color picker shared by the "Add new workspace" dialog
 * ({@link CreateWorkspaceModal}) and the "Edit workspace" dialog, mirroring
 * {@link WorkspacePrivacyPicker}'s `{ value, onChange, label }` shape. Offers
 * Tonk's palette through {@link ColorSwatchGrid}, whose Custom color view takes
 * any other hex.
 */
const WorkspaceColorPicker: React.FC<WorkspaceColorPickerProps> = ({
  value,
  onChange,
  label = "Workspace color",
}) => (
  <div>
    {label && <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">{label}</div>}
    <ColorSwatchGrid
      value={value}
      onSelect={onChange}
      aria_label={label || "Workspace color"}
      className="[--color-swatch-grid-surface:var(--color-shell-panel)] [--color-swatch-grid-ring:var(--color-shell-text)] [--color-swatch-grid-text:var(--color-shell-text)] [--color-swatch-grid-text-muted:var(--color-shell-text-muted)]"
    />
  </div>
);

export default WorkspaceColorPicker;
