"use client";

import { useRef } from "react";
import StatusOptionGrid from "@/components/board/cells/StatusOptionGrid";
import type { BoardCellOption, BoardOptionActions } from "@/components/board/cells/OptionPicker";
import type { TableBoardOption } from "./types";
import { useOutsideClick } from "./useOutsideClick";

interface StatusMenuProps {
  options: TableBoardOption[];
  onPickStatus: (option_id: string | null) => void;
  onClose: () => void;
  top_offset_px: number;
  /** Every option including inactive ones, with description. What the "Edit Labels" panel manages. Falls back to `options` when omitted. */
  full_options?: BoardCellOption[];
  /** Rename/recolor/delete/deactivate/describe an existing option. Supplying this unlocks the "Edit Labels" footer link; omit to hide it (e.g. a caller with no editing backend, like the standalone design preview). */
  option_actions?: BoardOptionActions;
  /** Creates a new option and resolves to it with its persisted id, shared with {@link EditLabelsPanel}'s own "+ New label" field. */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
}

const StatusMenu = ({
  options,
  onPickStatus,
  onClose,
  top_offset_px,
  full_options,
  option_actions,
  onCreateOption,
}: StatusMenuProps) => {
  const menu_ref = useRef<HTMLDivElement>(null);
  useOutsideClick(menu_ref, true, onClose);

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[470px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
      <StatusOptionGrid
        options={options}
        selected_id={null}
        onPick={onPickStatus}
        full_options={full_options}
        option_actions={option_actions}
        onCreateOption={onCreateOption}
      />
    </div>
  );
};

export default StatusMenu;
