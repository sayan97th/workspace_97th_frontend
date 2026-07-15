"use client";
import React, { useRef, useState } from "react";
import { BoardPopover } from "@/components/board";
import { DeleteIcon } from "@/icons/workspace-icons";
import { RestoreIcon } from "@/icons/trash-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";

export type TrashRowMenuProps = {
  entry_name: string;
  onRestore: () => void;
  onDeleteForever: () => void;
};

const menu_row_class =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-[#e9eded] transition-colors hover:bg-white/[0.08]";

/**
 * Per-row "..." menu (Restore / Delete permanently) for a trash/archive entry. Anchors a
 * {@link BoardPopover} to its own trigger button, the same "..." pattern the board
 * toolbar's `OverflowControl` uses, so it stays consistent with the rest of the app
 * instead of introducing a new dropdown primitive.
 */
const TrashRowMenu: React.FC<TrashRowMenuProps> = ({ entry_name, onRestore, onDeleteForever }) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Actions for ${entry_name}`}
        aria-haspopup="menu"
        aria-expanded={is_open}
        className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-[#8a9495] transition-colors hover:bg-white/[0.08] hover:text-[#e9eded] ${
          is_open ? "bg-white/[0.08] text-[#e9eded]" : ""
        }`}
      >
        <MoreDotsIcon size={15} />
      </button>

      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={close} width={196}>
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => {
              onRestore();
              close();
            }}
            className={menu_row_class}
          >
            <span className="flex flex-none text-[#9aa4a5]">
              <RestoreIcon size={14} />
            </span>
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteForever();
              close();
            }}
            className={`${menu_row_class} text-error-400 hover:bg-error-500/[0.12]`}
          >
            <span className="flex flex-none text-error-400">
              <DeleteIcon size={14} />
            </span>
            Delete permanently
          </button>
        </div>
      </BoardPopover>
    </>
  );
};

export default TrashRowMenu;
