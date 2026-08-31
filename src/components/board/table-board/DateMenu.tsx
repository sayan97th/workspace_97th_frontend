"use client";

import { useRef } from "react";
import DateCalendarPanel from "./DateCalendarPanel";
import { formatBoardDate, parseBoardDate } from "./dateUtils";
import { useOutsideClick } from "./useOutsideClick";

interface DateMenuProps {
  /** The cell's current stored date string (e.g. "Sep 17, 2026"), or "" when unset. */
  value: string;
  onPickDate: (date_string: string) => void;
  onClose: () => void;
  top_offset_px: number;
}

const DateMenu = ({ value, onPickDate, onClose, top_offset_px }: DateMenuProps) => {
  const menu_ref = useRef<HTMLDivElement>(null);
  useOutsideClick(menu_ref, true, onClose);

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[300px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
      <DateCalendarPanel value={parseBoardDate(value)} onChange={(date) => onPickDate(formatBoardDate(date))} />
    </div>
  );
};

export default DateMenu;
