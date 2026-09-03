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

const ROW = "flex h-[34px] w-full items-center justify-between gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-[#262b45]";

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
    <div className="absolute left-[266px] top-[-6px] z-10 w-[220px] rounded-[10px] border border-[#e3e6ef] bg-white p-2.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)]">
      <label className="flex items-center justify-between gap-2.5 px-1 pb-2 text-[13px] text-[#262b45]">
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
          className="h-8 w-20 rounded-[6px] border border-[#dfe3ef] px-2 text-[13px] text-[#262b45] outline-none focus:border-[#4f6bed]"
        />
      </label>

      <button type="button" onClick={() => onHideableChange(!hideable)} className={`${ROW} hover:bg-[#f1f3f9]`}>
        <span>Hideable</span>
        <ToggleSwitch is_on={hideable} size="sm" />
      </button>

      <button type="button" onClick={() => onPinnableChange(!pinnable)} className={`${ROW} hover:bg-[#f1f3f9]`}>
        <span>Pinnable</span>
        <ToggleSwitch is_on={pinnable} size="sm" />
      </button>

      {can_edit_labels && (
        <>
          <div className="my-1 h-px bg-[#eceef5]" />
          <button type="button" onClick={onEditLabels} className={`${ROW} hover:bg-[#f1f3f9]`}>
            <span>Edit labels</span>
          </button>
        </>
      )}
    </div>
  );
}
