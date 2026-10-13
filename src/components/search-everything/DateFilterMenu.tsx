"use client";

import { useEffect, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { CloseIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";

export type DatePreset = "any" | "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_90_days" | "custom";

export type DateRange = {
  preset: DatePreset;
  /** `YYYY-MM-DD`, inclusive. */
  date_from: string | null;
  date_to: string | null;
};

export const ANY_TIME: DateRange = { preset: "any", date_from: null, date_to: null };

const PRESET_LABELS: Record<Exclude<DatePreset, "custom">, string> = {
  any: "Any time",
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 3 months",
};

const toDay = (date: Date): string => format(date, "yyyy-MM-dd");

/** The inclusive day range a preset stands for, counted from today. */
const presetRange = (preset: Exclude<DatePreset, "custom">): DateRange => {
  const today = new Date();
  switch (preset) {
    case "today":
      return { preset, date_from: toDay(today), date_to: toDay(today) };
    case "yesterday":
      return { preset, date_from: toDay(subDays(today, 1)), date_to: toDay(subDays(today, 1)) };
    case "last_7_days":
      return { preset, date_from: toDay(subDays(today, 6)), date_to: null };
    case "last_30_days":
      return { preset, date_from: toDay(subDays(today, 29)), date_to: null };
    case "last_90_days":
      return { preset, date_from: toDay(subDays(today, 89)), date_to: null };
    default:
      return ANY_TIME;
  }
};

const rangeLabel = (range: DateRange): string => {
  if (range.preset !== "custom") return range.preset === "any" ? "Filter by date" : PRESET_LABELS[range.preset];
  return [range.date_from, range.date_to].filter(Boolean).join(" to ") || "Filter by date";
};

type DateFilterMenuProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  is_open: boolean;
  onOpenChange: (is_open: boolean) => void;
};

/**
 * "Filter by date": presets (Today, Last 7 days...) or a custom from/to range.
 * The button shows the active range and a clear button next to it.
 */
export default function DateFilterMenu({ value, onChange, is_open, onOpenChange }: DateFilterMenuProps) {
  const container_ref = useRef<HTMLDivElement>(null);
  const [custom_from, setCustomFrom] = useState(value.date_from ?? "");
  const [custom_to, setCustomTo] = useState(value.date_to ?? "");
  const is_active = value.preset !== "any";
  const is_custom_valid = Boolean(custom_from || custom_to) && (!custom_from || !custom_to || custom_from <= custom_to);

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [is_open, onOpenChange]);

  const pick = (range: DateRange) => {
    onChange(range);
    onOpenChange(false);
  };

  return (
    <div ref={container_ref} className="relative flex flex-none items-center gap-1">
      <button
        type="button"
        className="search-everything__outline-button"
        data-active={is_active || undefined}
        aria-haspopup="menu"
        aria-expanded={is_open}
        onClick={() => onOpenChange(!is_open)}
      >
        {rangeLabel(value)}
      </button>
      {is_active && (
        <Tooltip content="Clear date filter" placement="bottom">
          <button type="button" className="search-everything__icon-button" aria-label="Clear date filter" onClick={() => onChange(ANY_TIME)}>
            <CloseIcon size={10} />
          </button>
        </Tooltip>
      )}

      {is_open && (
        <div className="search-everything__date-menu" role="menu" aria-label="Filter by date">
          {(Object.keys(PRESET_LABELS) as Array<Exclude<DatePreset, "custom">>).map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitemradio"
              aria-checked={value.preset === preset}
              className="search-everything__date-option"
              onClick={() => pick(presetRange(preset))}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
          <form
            className="search-everything__date-custom"
            onSubmit={(event) => {
              event.preventDefault();
              if (is_custom_valid) pick({ preset: "custom", date_from: custom_from || null, date_to: custom_to || null });
            }}
          >
            <label className="search-everything__date-field">
              From
              <input type="date" value={custom_from} max={custom_to || undefined} onChange={(event) => setCustomFrom(event.target.value)} />
            </label>
            <label className="search-everything__date-field">
              To
              <input type="date" value={custom_to} min={custom_from || undefined} onChange={(event) => setCustomTo(event.target.value)} />
            </label>
            <button type="submit" className="search-everything__primary-button" disabled={!is_custom_valid}>
              Apply custom range
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
