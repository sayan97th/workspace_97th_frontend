"use client";

import { useState } from "react";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, TEXT_FAMILY_KINDS } from "../constants";
import type { ColumnKind, ColumnValidation } from "../types";
import { NUMBER_AGGREGATION_LABELS, type NumberAggregation } from "../summaryUtils";

interface ColumnSettingsPanelProps {
  width: number;
  hideable: boolean;
  pinnable: boolean;
  can_edit_labels: boolean;
  /** Drives which validation fields below are relevant — `min`/`max` for `number`, `pattern` for the text-family kinds. Undefined for the item-title/sub-title virtual columns, which skip validation entirely. */
  kind?: ColumnKind;
  validation?: ColumnValidation;
  /** Number kind only: which aggregation the group summary footer shows for this column, see `summaryUtils.ts`. Undefined behaves as `"sum"`. */
  aggregation?: NumberAggregation;
  /** Date kind only: due-date reminder settings, see `ColumnDef.reminder`. */
  reminder?: { enabled: boolean; days_before: number };
  onWidthChange: (width: number) => void;
  onHideableChange: (value: boolean) => void;
  onPinnableChange: (value: boolean) => void;
  onValidationChange?: (patch: Partial<ColumnValidation>) => void;
  onAggregationChange?: (aggregation: NumberAggregation) => void;
  onReminderChange?: (reminder: { enabled: boolean; days_before: number }) => void;
  onEditLabels: () => void;
}

const ROW = "flex h-[34px] w-full items-center justify-between gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-text";

export default function ColumnSettingsPanel({
  width, hideable, pinnable, can_edit_labels, kind, validation, aggregation, reminder, onWidthChange, onHideableChange, onPinnableChange, onValidationChange, onAggregationChange, onReminderChange, onEditLabels,
}: ColumnSettingsPanelProps) {
  const [draft, setDraft] = useState(String(width));
  const [pattern_draft, setPatternDraft] = useState(validation?.pattern ?? "");

  const commitWidth = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= MIN_COLUMN_WIDTH && parsed <= MAX_COLUMN_WIDTH) onWidthChange(Math.round(parsed));
    else setDraft(String(width));
  };

  return (
    <div className="absolute left-full top-[-6px] z-10 ml-1 w-[220px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-2.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
      <label className="flex items-center justify-between gap-2.5 px-1 pb-2 text-[13px] text-boardtree-text">
        <span>Width</span>
        <input
          type="number"
          min={MIN_COLUMN_WIDTH}
          max={MAX_COLUMN_WIDTH}
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

      {onAggregationChange && kind === "number" && (
        <>
          <div className="my-1 h-px bg-boardtree-border-soft" />
          <label className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-[13px] text-boardtree-text">
            <span>Group summary</span>
            <select
              value={aggregation ?? "sum"}
              onChange={(e) => onAggregationChange(e.target.value as NumberAggregation)}
              className="h-8 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
            >
              {(Object.keys(NUMBER_AGGREGATION_LABELS) as NumberAggregation[]).map((option) => (
                <option key={option} value={option}>{NUMBER_AGGREGATION_LABELS[option]}</option>
              ))}
            </select>
          </label>
        </>
      )}

      {onReminderChange && kind === "date" && (
        <>
          <div className="my-1 h-px bg-boardtree-border-soft" />
          <button type="button" onClick={() => onReminderChange({ enabled: !reminder?.enabled, days_before: reminder?.days_before ?? 0 })} className={`${ROW} hover:bg-boardtree-hover`}>
            <span>Due date reminder</span>
            <ToggleSwitch is_on={!!reminder?.enabled} size="sm" />
          </button>
          {reminder?.enabled && (
            <label className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-[13px] text-boardtree-text">
              <span>Days before</span>
              <input
                type="number"
                min={0}
                max={365}
                value={reminder.days_before}
                onChange={(e) => onReminderChange({ enabled: true, days_before: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 w-20 rounded-[6px] border border-boardtree-border px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
              />
            </label>
          )}
        </>
      )}

      {onValidationChange && kind && (
        <>
          <div className="my-1 h-px bg-boardtree-border-soft" />
          <button type="button" onClick={() => onValidationChange({ required: !validation?.required })} className={`${ROW} hover:bg-boardtree-hover`}>
            <span>Required</span>
            <ToggleSwitch is_on={!!validation?.required} size="sm" />
          </button>

          {kind === "number" && (
            <>
              <label className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-[13px] text-boardtree-text">
                <span>Min value</span>
                <input
                  type="number"
                  value={validation?.min ?? ""}
                  onChange={(e) => onValidationChange({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
                  className="h-8 w-20 rounded-[6px] border border-boardtree-border px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
                />
              </label>
              <label className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-[13px] text-boardtree-text">
                <span>Max value</span>
                <input
                  type="number"
                  value={validation?.max ?? ""}
                  onChange={(e) => onValidationChange({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
                  className="h-8 w-20 rounded-[6px] border border-boardtree-border px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
                />
              </label>
            </>
          )}

          {TEXT_FAMILY_KINDS.includes(kind) && (
            <label className="flex flex-col gap-1 px-1 py-1.5 text-[13px] text-boardtree-text">
              <span>Match pattern (regex)</span>
              <input
                value={pattern_draft}
                onChange={(e) => setPatternDraft(e.target.value)}
                onBlur={() => onValidationChange({ pattern: pattern_draft.trim() || undefined })}
                placeholder="e.g. ^[A-Z]{2}[0-9]+$"
                className="h-8 w-full rounded-[6px] border border-boardtree-border px-2 font-mono text-[12px] text-boardtree-text outline-none focus:border-boardtree-accent"
              />
            </label>
          )}
        </>
      )}

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
