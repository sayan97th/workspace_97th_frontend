import React from "react";
import type { BoardType } from "@/types/workspace";

const BOARD_TYPE_OPTIONS: { value: BoardType; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "private", label: "Private" },
  { value: "shareable", label: "Shareable" },
];

const BOARD_TYPE_HINTS: Record<BoardType, string> = {
  main: "Visible to everyone in the workspace",
  private: "Only visible to people added to this board",
  shareable: "Visible to workspace members, and can be shared with people outside the workspace",
};

type BoardTypeOptionProps = {
  value: BoardType;
  label: string;
  is_selected: boolean;
  onSelect: (value: BoardType) => void;
};

const BoardTypeOption: React.FC<BoardTypeOptionProps> = ({ value, label, is_selected, onSelect }) => (
  <button type="button" onClick={() => onSelect(value)} className="flex items-center gap-2 text-left">
    <span
      className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${
        is_selected ? "border-[#2B76E5]" : "border-shell-border-strong"
      }`}
    >
      {is_selected && <span className="h-2 w-2 rounded-full bg-[#2B76E5]" />}
    </span>
    <span className="text-[13.5px] font-medium text-shell-text">{label}</span>
  </button>
);

export type BoardTypePickerProps = {
  value: BoardType;
  onChange: (value: BoardType) => void;
  /** Optional label above the radios; omit when the caller renders its own. */
  label?: string;
};

/**
 * Main/Private/Shareable radio group + hint text for a board's privacy level —
 * the board-level counterpart of {@link WorkspacePrivacyPicker}, shared by the
 * "Change board type" dialog and any future board-creation flow.
 */
const BoardTypePicker: React.FC<BoardTypePickerProps> = ({ value, onChange, label = "Board type" }) => (
  <div>
    {label && <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">{label}</div>}
    <div className="flex flex-col gap-2.5">
      {BOARD_TYPE_OPTIONS.map((option) => (
        <BoardTypeOption
          key={option.value}
          value={option.value}
          label={option.label}
          is_selected={value === option.value}
          onSelect={onChange}
        />
      ))}
    </div>
    <div className="mt-[9px] text-xs text-gray-400">{BOARD_TYPE_HINTS[value]}</div>
  </div>
);

export default BoardTypePicker;
export { BOARD_TYPE_OPTIONS, BOARD_TYPE_HINTS };
