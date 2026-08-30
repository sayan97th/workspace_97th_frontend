"use client";

import { useRef } from "react";
import { BOARD_STATUSES, getStatusBackground, getStatusForeground } from "./constants";
import { EditPencilIcon } from "./icons";
import { useOutsideClick } from "./useOutsideClick";

interface StatusMenuProps {
  onPickStatus: (status: string) => void;
  onClose: () => void;
  top_offset_px: number;
}

const StatusMenu = ({ onPickStatus, onClose, top_offset_px }: StatusMenuProps) => {
  const menu_ref = useRef<HTMLDivElement>(null);
  useOutsideClick(menu_ref, true, onClose);

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[470px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white p-3.5 shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
      <div className="grid grid-cols-3 gap-2">
        {BOARD_STATUSES.map((status) => (
          <button
            type="button"
            key={status || "none"}
            onClick={() => onPickStatus(status)}
            className="flex h-[30px] items-center justify-center rounded text-[11.5px] font-medium hover:brightness-[1.07]"
            style={{ background: getStatusBackground(status), color: getStatusForeground(status) }}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="mt-3.5 h-px bg-[#eceef5]" />
      <button type="button" className="flex h-[42px] w-full items-center justify-center gap-2 text-[13.5px] text-[#4a5068] hover:text-[#4f6bed]">
        <EditPencilIcon />
        Edit Labels
      </button>
    </div>
  );
};

export default StatusMenu;
