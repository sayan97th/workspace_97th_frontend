"use client";

import { useState } from "react";
import { DOW_CELLS, buildCalendarDays, monthLabelOf, monthOf, shiftMonth, type MonthCursor } from "../../_lib/date_utils";

interface CalendarGridProps {
  selected_iso?: string;
  range_start_iso?: string;
  range_end_iso?: string;
  accent?: string;
  onPick: (iso: string) => void;
}

export default function CalendarGrid({ selected_iso, range_start_iso, range_end_iso, accent = "#4f6bed", onPick }: CalendarGridProps) {
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(range_start_iso || selected_iso));
  const days = buildCalendarDays(cursor);

  const styleFor = (iso: string) => {
    const is_selected = selected_iso === iso;
    const is_edge = range_start_iso === iso || (!!range_end_iso && range_end_iso === iso);
    const is_inside = !!range_start_iso && !!range_end_iso && iso > range_start_iso && iso < range_end_iso;
    const day = days.find((d) => d.iso === iso)!;
    if (is_selected || is_edge) return { bg: accent, fg: "#ffffff", weight: "600" };
    if (is_inside) return { bg: "#e7ebff", fg: "#262b45", weight: "400" };
    if (!day.in_month) return { bg: "transparent", fg: "#c8ccda", weight: "400" };
    if (day.is_today) return { bg: "transparent", fg: accent, weight: "600" };
    return { bg: "transparent", fg: "#262b45", weight: "400" };
  };

  return (
    <div>
      <div className="flex items-center justify-between px-0.5 pb-2">
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c, -1))}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#f1f3f9]"
        >
          <svg viewBox="0 0 12 12" width="11" height="11"><path d="M7.5 3 L4 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="text-[13px] font-semibold text-[#1e2237]">{monthLabelOf(cursor)}</div>
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#f1f3f9]"
        >
          <svg viewBox="0 0 12 12" width="11" height="11"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {DOW_CELLS.map((dow) => (
          <div key={dow.key} className="flex h-[22px] items-center justify-center text-[10.5px] text-[#a4aac2]">
            {dow.label}
          </div>
        ))}
        {days.map((day) => {
          const s = styleFor(day.iso);
          return (
            <button
              type="button"
              key={day.iso}
              onClick={() => onPick(day.iso)}
              className="flex h-[30px] items-center justify-center rounded-[6px] text-[12px] hover:shadow-[inset_0_0_0_1px_#4f6bed]"
              style={{ background: s.bg, color: s.fg, fontWeight: s.weight }}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
