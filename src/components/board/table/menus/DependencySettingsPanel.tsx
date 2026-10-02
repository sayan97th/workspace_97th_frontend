"use client";

import ToggleSwitch from "../../toolbar/ToggleSwitch";
import type { ColumnDef, DependencyConfig, DependencyMode } from "../types";

interface DependencySettingsPanelProps {
  dependency?: DependencyConfig;
  date_columns: NonNullable<ColumnDef["dependency_date_columns"]>;
  onChange: (dependency: DependencyConfig) => void;
}

/** The three modes, worded after monday.com's own Dependency column settings. */
export const DEPENDENCY_MODE_OPTIONS: { mode: DependencyMode; label: string; hint: string }[] = [
  { mode: "strict", label: "Strict", hint: "Dependent items keep their exact distance. When a date moves, the items that depend on it move with it." },
  { mode: "flexible", label: "Flexible", hint: "Dependent items only move later, when a date change would break their distance." },
  { mode: "none", label: "No action", hint: "Links are shown only, dates never move by themselves." },
];

const DEFAULT_DEPENDENCY: DependencyConfig = { date_column_id: null, mode: "none", use_working_days: false };

/**
 * A Dependency column's settings flyout in its header menu: which Date or Timeline column it
 * schedules, how dependent dates move, and whether lags count working days only. Every change
 * saves right away, like the Date column's reminder settings.
 */
export default function DependencySettingsPanel({ dependency, date_columns, onChange }: DependencySettingsPanelProps) {
  const current = dependency ?? DEFAULT_DEPENDENCY;
  const update = (patch: Partial<DependencyConfig>) => onChange({ ...current, ...patch });

  return (
    <div className="absolute left-full top-[-6px] z-10 ml-1 w-[280px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-3 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
      <label className="block pb-3">
        <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Date column to schedule</span>
        <select
          value={current.date_column_id ?? ""}
          onChange={(e) => update({ date_column_id: e.target.value || null })}
          aria-label="Date column to schedule"
          className="h-8 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
        >
          <option value="">None</option>
          {date_columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title} ({column.kind === "timeline" ? "Timeline" : "Date"})
            </option>
          ))}
        </select>
        {date_columns.length === 0 && (
          <span className="mt-1 block text-[11.5px] leading-snug text-boardtree-text-faint">Add a Date or Timeline column to this table first.</span>
        )}
      </label>

      <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">When a date changes</div>
      <div role="radiogroup" aria-label="Dependency mode" className="flex flex-col gap-0.5 pb-2">
        {DEPENDENCY_MODE_OPTIONS.map((option) => {
          const is_selected = current.mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={is_selected}
              onClick={() => update({ mode: option.mode })}
              className="flex items-start gap-2.5 rounded-[6px] px-2 py-1.5 text-left hover:bg-boardtree-hover"
            >
              <span
                className="mt-[3px] flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border"
                style={{ borderColor: is_selected ? "var(--color-boardtree-accent)" : "var(--color-boardtree-border)" }}
              >
                {is_selected && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-boardtree-text">{option.label}</span>
                <span className="block text-[11.5px] leading-snug text-boardtree-text-faint">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-1 h-px bg-boardtree-border-soft" />
      <button
        type="button"
        onClick={() => update({ use_working_days: !current.use_working_days })}
        className="flex h-[34px] w-full items-center justify-between gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover"
      >
        <span>Count working days only</span>
        <ToggleSwitch is_on={current.use_working_days} size="sm" />
      </button>
    </div>
  );
}
