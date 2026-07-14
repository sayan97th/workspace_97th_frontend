import React from "react";
import { CheckIcon } from "@/icons/board-icons";

export type ToolbarCheckboxState = "checked" | "partial" | "unchecked";

export type ToolbarCheckboxProps = {
  state: ToolbarCheckboxState;
  size?: number;
};

/**
 * Tri-state checkbox glyph (checked / partially-checked / empty) shared by the board
 * toolbar's column pickers — e.g. the Hide-columns panel's "All columns" and group
 * master rows, which need an indeterminate state when only some columns are hidden.
 */
const ToolbarCheckbox: React.FC<ToolbarCheckboxProps> = ({ state, size = 16 }) => (
  <span
    className={`flex flex-none items-center justify-center rounded border ${
      state === "unchecked" ? "border-white/25" : "border-brand-500 bg-brand-500"
    }`}
    style={{ width: size, height: size }}
  >
    {state === "checked" && <CheckIcon size={Math.round(size * 0.65)} className="text-white" />}
    {state === "partial" && <span className="h-[2px] w-[8px] rounded-full bg-white" />}
  </span>
);

export default ToolbarCheckbox;
