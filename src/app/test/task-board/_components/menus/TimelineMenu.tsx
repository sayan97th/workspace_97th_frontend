"use client";

import { useState } from "react";
import { fmtDateShort } from "../../_lib/date_utils";
import CalendarGrid from "./CalendarGrid";
import PopoverPanel from "./PopoverPanel";

interface TimelineMenuProps {
  start_iso: string;
  end_iso: string;
  onChange: (start_iso: string, end_iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TimelineMenu({ start_iso, end_iso, onChange, onClear, onClose }: TimelineMenuProps) {
  const [active_edge, setActiveEdge] = useState<"start" | "end">(start_iso ? "end" : "start");

  const pick = (iso: string) => {
    if (active_edge === "start") {
      const next_end = end_iso && end_iso < iso ? iso : end_iso;
      onChange(iso, next_end);
      setActiveEdge("end");
    } else {
      const next_start = start_iso && start_iso > iso ? iso : start_iso;
      onChange(next_start, iso);
    }
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[292px] -translate-x-1/2 p-3">
      <div className="flex gap-2 pb-2.5">
        <button
          type="button"
          onClick={() => setActiveEdge("start")}
          className="flex-1 rounded-[7px] border px-[9px] py-[5px] text-left"
          style={{ borderColor: active_edge === "start" ? "#4f6bed" : "#e6e9f2", background: active_edge === "start" ? "#eef1ff" : "#fff" }}
        >
          <div className="text-[9.5px] uppercase tracking-wide text-[#a4aac2]">Start</div>
          <div className="text-[12.5px] text-[#262b45]">{fmtDateShort(start_iso) || "—"}</div>
        </button>
        <button
          type="button"
          onClick={() => setActiveEdge("end")}
          className="flex-1 rounded-[7px] border px-[9px] py-[5px] text-left"
          style={{ borderColor: active_edge === "end" ? "#4f6bed" : "#e6e9f2", background: active_edge === "end" ? "#eef1ff" : "#fff" }}
        >
          <div className="text-[9.5px] uppercase tracking-wide text-[#a4aac2]">End</div>
          <div className="text-[12.5px] text-[#262b45]">{fmtDateShort(end_iso) || "—"}</div>
        </button>
      </div>
      <CalendarGrid range_start_iso={start_iso} range_end_iso={end_iso} onPick={pick} />
      <div className="flex items-center justify-between pt-[11px]">
        <button type="button" onClick={onClear} className="text-[12px] text-[#8b90a6] hover:text-[#4f6bed]">
          Clear dates
        </button>
        <div className="text-[11px] text-[#b6bbcd]">{active_edge === "start" ? "Pick a start date" : "Pick an end date"}</div>
      </div>
    </PopoverPanel>
  );
}
