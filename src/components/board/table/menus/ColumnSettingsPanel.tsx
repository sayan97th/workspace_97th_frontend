"use client";

import { useState } from "react";
import ToggleSwitch from "../../toolbar/ToggleSwitch";

interface ColumnSettingsPanelProps {
  width: number;
  hideable: boolean;
  pinnable: boolean;
  can_edit_labels: boolean;
  onWidthChange: (width: number) => void;
  onHideableChange: (value: boolean) => void;
  onPinnableChange: (value: boolean) => void;
  onEditLabels: () => void;
}

const ROW = "flex h-[34px] w-full items-center justify-between gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-text";

export default function ColumnSettingsPanel({
  width, hideable, pinnable, can_edit_labels, onWidthChange, onHideableChange, onPinnableChange, onEditLabels,
}: ColumnSettingsPanelProps) {
  const [draft, setDraft] = useState(String(width));

  const commitWidth = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 40 && parsed <= 600) onWidthChange(Math.round(parsed));
    else setDraft(String(width));
  };

  return (
    <div className="absolute left-full top-[-6px] z-10 ml-1 w-[220px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-2.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
      <label className="flex items-center justify-between gap-2.5 px-1 pb-2 text-[13px] text-boardtree-text">
        <span>Width</span>
        <input
          type="number"
          min={40}
          max={600}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitWidth}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-8 w-20 rounded-[6px] border border-boardtree-border px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
        />
      </label>

      <button type="button" onClick={() => onHideableChange(!hideable)} className={`${ROW} hover:bg-boardtree-hover`}>
        <span>Hideable</span>
        <ToggleSwitch is_on={hideable} size="sm" />
      </button>

      <button type="button" onClick={() => onPinnableChange(!pinnable)} className={`${ROW} hover:bg-boardtree-hover`}>
        <span>Pinnable</span>
        <ToggleSwitch is_on={pinnable} size="sm" />
      </button>

      {can_edit_labels && (
        <>
          <div className="my-1 h-px bg-boardtree-border-soft" />
          <button type="button" onClick={onEditLabels} className={`${ROW} hover:bg-boardtree-hover`}>
            <span>Edit labels</span>
          </button>
        </>
      )}
    </div>
  );
}
