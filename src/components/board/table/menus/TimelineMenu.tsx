"use client";

import { useState } from "react";
import { fmtDateShort } from "../dateUtils";
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
          style={{ borderColor: active_edge === "start" ? "var(--color-boardtree-accent)" : "var(--color-boardtree-border)", background: active_edge === "start" ? "var(--color-boardtree-accent-surface)" : "var(--color-boardtree-surface)" }}
        >
          <div className="text-[9.5px] uppercase tracking-wide text-boardtree-text-faint">Start</div>
          <div className="text-[12.5px] text-boardtree-text">{fmtDateShort(start_iso) || "—"}</div>
        </button>
        <button
          type="button"
          onClick={() => setActiveEdge("end")}
          className="flex-1 rounded-[7px] border px-[9px] py-[5px] text-left"
          style={{ borderColor: active_edge === "end" ? "var(--color-boardtree-accent)" : "var(--color-boardtree-border)", background: active_edge === "end" ? "var(--color-boardtree-accent-surface)" : "var(--color-boardtree-surface)" }}
        >
          <div className="text-[9.5px] uppercase tracking-wide text-boardtree-text-faint">End</div>
          <div className="text-[12.5px] text-boardtree-text">{fmtDateShort(end_iso) || "—"}</div>
        </button>
      </div>
      <CalendarGrid range_start_iso={start_iso} range_end_iso={end_iso} onPick={pick} />
      <div className="flex items-center justify-between pt-[11px]">
        <button type="button" onClick={onClear} className="text-[12px] text-boardtree-text-muted hover:text-boardtree-accent">
          Clear dates
        </button>
        <div className="text-[11px] text-boardtree-text-faint">{active_edge === "start" ? "Pick a start date" : "Pick an end date"}</div>
      </div>
    </PopoverPanel>
  );
}
