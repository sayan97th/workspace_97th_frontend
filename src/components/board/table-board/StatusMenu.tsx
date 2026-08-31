"use client";

import { useRef, useState } from "react";
import EditLabelsPanel from "@/components/board/cells/EditLabelsPanel";
import type { BoardCellOption, BoardOptionActions } from "@/components/board/cells/OptionPicker";
import { EditPencilIcon } from "./icons";
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
  const [is_editing_labels, setIsEditingLabels] = useState(false);
  useOutsideClick(menu_ref, true, onClose);

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[470px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white p-3.5 shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
      {is_editing_labels && option_actions ? (
        <EditLabelsPanel
          options={full_options ?? options}
          actions={option_actions}
          onCreateOption={onCreateOption}
          onDone={() => setIsEditingLabels(false)}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onPickStatus(null)}
              className="flex h-[30px] items-center justify-center rounded text-[11.5px] font-medium hover:brightness-[1.07]"
              style={{ background: "#c9ccd4", color: "#ffffff" }}
            />
            {options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onPickStatus(option.id)}
                className="flex h-[30px] items-center justify-center rounded text-[11.5px] font-medium hover:brightness-[1.07]"
                style={{ background: option.color, color: "#ffffff" }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {option_actions && (
            <>
              <div className="mt-3.5 h-px bg-[#eceef5]" />
              <button
                type="button"
                onClick={() => setIsEditingLabels(true)}
                className="flex h-[42px] w-full items-center justify-center gap-2 text-[13.5px] text-[#4a5068] hover:text-[#4f6bed]"
              >
                <EditPencilIcon />
                Edit Labels
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StatusMenu;
