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
 * A Dependency column's settings flyout in its header menu (card and placement come from `ColumnMenu`): which Date or Timeline column it
 * schedules, how dependent dates move, and whether lags count working days only. Every change
 * saves right away, like the Date column's reminder settings.
 */
export default function DependencySettingsPanel({ dependency, date_columns, onChange }: DependencySettingsPanelProps) {
  const current = dependency ?? DEFAULT_DEPENDENCY;
  const update = (patch: Partial<DependencyConfig>) => onChange({ ...current, ...patch });

  return (
    <div className="action-menu column-menu__form w-[288px]">
      <label className="column-menu__field column-menu__field--stacked">
        <span className="column-menu__label px-0">Date column to schedule</span>
        <select
          value={current.date_column_id ?? ""}
          onChange={(e) => update({ date_column_id: e.target.value || null })}
          aria-label="Date column to schedule"
          className="column-menu__input"
        >
          <option value="">None</option>
          {date_columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title} ({column.kind === "timeline" ? "Timeline" : "Date"})
            </option>
          ))}
        </select>
        {date_columns.length === 0 && <span className="column-menu__help px-0">Add a Date or Timeline column to this table first.</span>}
      </label>

      <div className="column-menu__label">When a date changes</div>
      <div role="radiogroup" aria-label="Dependency mode" className="flex flex-col">
        {DEPENDENCY_MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={current.mode === option.mode}
            onClick={() => update({ mode: option.mode })}
            className="column-menu__radio"
          >
            <span className="column-menu__radio-dot" aria-hidden="true" />
            <span className="min-w-0">
              <span className="column-menu__radio-title">{option.label}</span>
              <span className="column-menu__radio-hint">{option.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="action-menu__divider" role="separator" />
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={current.use_working_days}
        onClick={() => update({ use_working_days: !current.use_working_days })}
        className="action-menu__item"
      >
        <span className="action-menu__label">Count working days only</span>
        <ToggleSwitch is_on={current.use_working_days} size="sm" />
      </button>
    </div>
  );
}
