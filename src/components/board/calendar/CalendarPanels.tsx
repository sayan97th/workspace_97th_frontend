"use client";
import React from "react";
import type { BoardCalendarColorBy, BoardCalendarConfig } from "./calendarConfig";

/** A Date or Timeline column the calendar can place items by. */
export type CalendarDateSource = { id: string; label: string; kind: "date" | "timeline" };

/** A Status column the calendar can color items by. */
export type CalendarColorSource = { id: string; label: string };

/** A group (table) of the board, for the header's filter. */
export type CalendarGroupOption = { id: number; label: string; color: string };

const SOURCE_KIND_LABELS: Record<CalendarDateSource["kind"], string> = { date: "Date", timeline: "Timeline" };

type CheckRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
};

const CheckRow: React.FC<CheckRowProps> = ({ checked, disabled = false, onChange, children }) => (
  <label className="board-calendar-panel__row" data-disabled={disabled || undefined}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="board-calendar-panel__check" />
    {children}
  </label>
);

type RadioRowProps = {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
};

const RadioRow: React.FC<RadioRowProps> = ({ name, checked, disabled = false, onChange, children }) => (
  <label className="board-calendar-panel__row" data-disabled={disabled || undefined}>
    <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="board-calendar-panel__check" />
    {children}
  </label>
);

export type CalendarFilterPanelProps = {
  groups: CalendarGroupOption[];
  hidden_group_ids: number[];
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onChange?: (hidden_group_ids: number[]) => void;
};

/** The header funnel's popover: pick which groups' items the calendar shows. */
export const CalendarFilterPanel: React.FC<CalendarFilterPanelProps> = ({ groups, hidden_group_ids, onChange }) => {
  const hidden_ids = new Set(hidden_group_ids);
  const shown_count = groups.filter((group) => !hidden_ids.has(group.id)).length;

  const toggleGroup = (group_id: number) => {
    if (!onChange) return;
    onChange(hidden_ids.has(group_id) ? hidden_group_ids.filter((id) => id !== group_id) : [...hidden_group_ids, group_id]);
  };

  return (
    <div className="board-calendar-popover board-calendar-panel" role="dialog" aria-label="Filter calendar">
      <div className="board-calendar-panel__heading">
        <span>Filter calendar</span>
        {onChange && hidden_group_ids.length > 0 && (
          <button type="button" className="board-calendar-panel__link" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <p className="board-calendar-panel__hint">
        Showing items from {shown_count} of {groups.length} {groups.length === 1 ? "group" : "groups"}
      </p>
      <div className="board-calendar-panel__list">
        {groups.length === 0 && <p className="board-calendar-panel__empty">This board has no groups yet.</p>}
        {groups.map((group) => (
          <CheckRow key={group.id} checked={!hidden_ids.has(group.id)} disabled={!onChange} onChange={() => toggleGroup(group.id)}>
            <span className="board-calendar-panel__swatch" style={{ background: group.color }} aria-hidden />
            <span className="board-calendar-panel__label">{group.label}</span>
          </CheckRow>
        ))}
      </div>
    </div>
  );
};

export type CalendarSettingsPanelProps = {
  config: BoardCalendarConfig;
  date_sources: CalendarDateSource[];
  /** The source ids the calendar actually shows right now (the saved pick, or every source when nothing is saved). */
  active_source_ids: string[];
  color_sources: CalendarColorSource[];
  /** The color source in effect, after falling back from a missing saved one. */
  active_color_by: BoardCalendarColorBy;
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onChange?: (next: BoardCalendarConfig) => void;
};

/**
 * "Calendar settings", the options monday.com keeps behind its calendar's
 * menu: which Date/Timeline columns place items, what colors them, whether
 * events show their people and which day starts the week.
 */
export const CalendarSettingsPanel: React.FC<CalendarSettingsPanelProps> = ({
  config,
  date_sources,
  active_source_ids,
  color_sources,
  active_color_by,
  onChange,
}) => {
  const is_read_only = !onChange;
  const active_ids = new Set(active_source_ids);
  const update = (patch: Partial<BoardCalendarConfig>) => onChange?.({ ...config, ...patch });

  const toggleSource = (source_id: string) => {
    const next_ids = active_ids.has(source_id)
      ? active_source_ids.filter((id) => id !== source_id)
      : date_sources.filter((source) => source.id === source_id || active_ids.has(source.id)).map((source) => source.id);
    // At least one column always stays on, an empty calendar with nothing to pick from reads as broken.
    if (next_ids.length === 0) return;
    update({ date_column_ids: next_ids.length === date_sources.length ? null : next_ids });
  };

  return (
    <div className="board-calendar-popover board-calendar-panel board-calendar-panel--settings" role="dialog" aria-label="Calendar settings">
      <div className="board-calendar-panel__heading">
        <span>Calendar settings</span>
      </div>
      {is_read_only && <p className="board-calendar-panel__hint">You can't change the settings of this view.</p>}

      <section className="board-calendar-panel__section">
        <h3 className="board-calendar-panel__section-title">Show items by</h3>
        <div className="board-calendar-panel__list">
          {date_sources.map((source) => (
            <CheckRow
              key={source.id}
              checked={active_ids.has(source.id)}
              disabled={is_read_only || (active_ids.has(source.id) && active_ids.size === 1)}
              onChange={() => toggleSource(source.id)}
            >
              <span className="board-calendar-panel__label">{source.label}</span>
              <span className="board-calendar-panel__meta">{SOURCE_KIND_LABELS[source.kind]}</span>
            </CheckRow>
          ))}
        </div>
      </section>

      <section className="board-calendar-panel__section">
        <h3 className="board-calendar-panel__section-title">Color items by</h3>
        <div className="board-calendar-panel__list">
          {color_sources.map((source) => (
            <RadioRow
              key={source.id}
              name="calendar_color_by"
              checked={active_color_by === source.id}
              disabled={is_read_only}
              onChange={() => update({ color_by: source.id })}
            >
              <span className="board-calendar-panel__label">{source.label}</span>
            </RadioRow>
          ))}
          <RadioRow name="calendar_color_by" checked={active_color_by === "group"} disabled={is_read_only} onChange={() => update({ color_by: "group" })}>
            <span className="board-calendar-panel__label">Group</span>
          </RadioRow>
          <RadioRow name="calendar_color_by" checked={active_color_by === "none"} disabled={is_read_only} onChange={() => update({ color_by: "none" })}>
            <span className="board-calendar-panel__label">None</span>
          </RadioRow>
        </div>
      </section>

      <section className="board-calendar-panel__section">
        <h3 className="board-calendar-panel__section-title">Item info</h3>
        <CheckRow checked={config.show_people !== false} disabled={is_read_only} onChange={() => update({ show_people: config.show_people === false })}>
          <span className="board-calendar-panel__label">Show people</span>
        </CheckRow>
      </section>

      <section className="board-calendar-panel__section">
        <h3 className="board-calendar-panel__section-title">Week starts on</h3>
        <div className="board-calendar-panel__segmented" role="radiogroup" aria-label="Week starts on">
          {([
            [0, "Sunday"],
            [1, "Monday"],
          ] as const).map(([day, label]) => (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={(config.week_starts_on ?? 0) === day}
              disabled={is_read_only}
              onClick={() => update({ week_starts_on: day })}
              className="board-calendar-panel__segment"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
