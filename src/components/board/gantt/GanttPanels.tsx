"use client";
import React from "react";
import {
  getBaselineItems,
  type BoardGanttColorBy,
  type BoardGanttConfig,
  type GanttColorSource,
  type GanttDateSource,
  type GanttGroupOption,
} from "./ganttConfig";

const SOURCE_KIND_LABELS: Record<GanttDateSource["kind"], string> = { date: "Date", timeline: "Timeline" };

type ChoiceRowProps = {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
};

const ChoiceRow: React.FC<ChoiceRowProps> = ({ type, name, checked, disabled = false, onChange, children }) => (
  <label className="board-gantt-panel__row" data-disabled={disabled || undefined}>
    <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} className="board-gantt-panel__check" />
    {children}
  </label>
);

export type GanttFilterPanelProps = {
  groups: GanttGroupOption[];
  hidden_group_ids: number[];
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onChange?: (hidden_group_ids: number[]) => void;
};

/** The header funnel's popover: pick which groups' items the Gantt shows. */
export const GanttFilterPanel: React.FC<GanttFilterPanelProps> = ({ groups, hidden_group_ids, onChange }) => {
  const hidden_ids = new Set(hidden_group_ids);
  const shown_count = groups.filter((group) => !hidden_ids.has(group.id)).length;

  const toggleGroup = (group_id: number) => {
    if (!onChange) return;
    onChange(hidden_ids.has(group_id) ? hidden_group_ids.filter((id) => id !== group_id) : [...hidden_group_ids, group_id]);
  };

  return (
    <div className="board-gantt-popover board-gantt-panel" role="dialog" aria-label="Filter Gantt">
      <div className="board-gantt-panel__heading">
        <span>Filter Gantt</span>
        {onChange && hidden_group_ids.length > 0 && (
          <button type="button" className="board-gantt-panel__link" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <p className="board-gantt-panel__hint">
        Showing items from {shown_count} of {groups.length} {groups.length === 1 ? "group" : "groups"}
      </p>
      <div className="board-gantt-panel__list">
        {groups.length === 0 && <p className="board-gantt-panel__hint">This board has no groups yet.</p>}
        {groups.map((group) => (
          <ChoiceRow key={group.id} type="checkbox" checked={!hidden_ids.has(group.id)} disabled={!onChange} onChange={() => toggleGroup(group.id)}>
            <span className="board-gantt-panel__swatch" style={{ background: group.color }} aria-hidden />
            <span className="board-gantt-panel__label">{group.label}</span>
          </ChoiceRow>
        ))}
      </div>
    </div>
  );
};

export type GanttSettingsPanelProps = {
  config: BoardGanttConfig;
  date_sources: GanttDateSource[];
  /** The source placing the bars right now, after falling back from a missing saved one. */
  active_source_id: string;
  color_sources: GanttColorSource[];
  /** The color source in effect, after falling back from a missing saved one. */
  active_color_by: BoardGanttColorBy;
  /** Whether the board has a Dependency column to draw arrows from. */
  has_dependency_column: boolean;
  /** Offers to add a Dependency column when the board has none. */
  onAddDependencyColumn?: () => void;
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onChange?: (next: BoardGanttConfig) => void;
};

/**
 * "Gantt settings", the options monday.com keeps behind its Gantt's menu:
 * which column places the bars, what colors them, the bar label and the
 * view toggles (group summary, dependencies, critical path, baseline,
 * legend and weekends).
 */
export const GanttSettingsPanel: React.FC<GanttSettingsPanelProps> = ({
  config,
  date_sources,
  active_source_id,
  color_sources,
  active_color_by,
  has_dependency_column,
  onAddDependencyColumn,
  onChange,
}) => {
  const is_read_only = !onChange;
  const update = (patch: Partial<BoardGanttConfig>) => onChange?.({ ...config, ...patch });
  const has_baseline = Boolean(config.baseline);
  const bar_label = config.bar_label ?? "none";

  const color_choices: { id: BoardGanttColorBy; label: string }[] = [
    { id: "group", label: "Group" },
    ...color_sources.map((source) => ({ id: source.id, label: source.label })),
    { id: "none", label: "None" },
  ];

  return (
    <div className="board-gantt-popover board-gantt-panel board-gantt-panel--settings" role="dialog" aria-label="Gantt settings">
      <div className="board-gantt-panel__heading">
        <span>Gantt settings</span>
      </div>
      {is_read_only && <p className="board-gantt-panel__hint">You can't change the settings of this view.</p>}

      <section className="board-gantt-panel__section">
        <h3 className="board-gantt-panel__section-title">Show items by</h3>
        <div className="board-gantt-panel__list">
          {date_sources.map((source) => (
            <ChoiceRow
              key={source.id}
              type="radio"
              name="gantt_date_column"
              checked={active_source_id === source.id}
              disabled={is_read_only}
              onChange={() => update({ date_column_id: source.id })}
            >
              <span className="board-gantt-panel__label">{source.label}</span>
              <span className="board-gantt-panel__meta">{SOURCE_KIND_LABELS[source.kind]}</span>
            </ChoiceRow>
          ))}
        </div>
      </section>

      <section className="board-gantt-panel__section">
        <h3 className="board-gantt-panel__section-title">Color items by</h3>
        <div className="board-gantt-panel__list">
          {color_choices.map((choice) => (
            <ChoiceRow
              key={choice.id}
              type="radio"
              name="gantt_color_by"
              checked={active_color_by === choice.id}
              disabled={is_read_only}
              onChange={() => update({ color_by: choice.id })}
            >
              <span className="board-gantt-panel__label">{choice.label}</span>
            </ChoiceRow>
          ))}
        </div>
      </section>

      <section className="board-gantt-panel__section">
        <h3 className="board-gantt-panel__section-title">Bar label</h3>
        <div className="board-gantt-panel__segmented" role="radiogroup" aria-label="Bar label">
          {([
            ["none", "None"],
            ["name", "Item name"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={bar_label === value}
              disabled={is_read_only}
              onClick={() => update({ bar_label: value })}
              className="board-gantt-panel__segment"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="board-gantt-panel__section">
        <h3 className="board-gantt-panel__section-title">View</h3>
        <ChoiceRow
          type="checkbox"
          checked={config.show_group_summary !== false}
          disabled={is_read_only}
          onChange={() => update({ show_group_summary: config.show_group_summary === false })}
        >
          <span className="board-gantt-panel__label">Show group summary</span>
        </ChoiceRow>
        <ChoiceRow
          type="checkbox"
          checked={has_dependency_column && config.show_dependencies !== false}
          disabled={is_read_only || !has_dependency_column}
          onChange={() => update({ show_dependencies: config.show_dependencies === false })}
        >
          <span className="board-gantt-panel__label">Show dependencies</span>
        </ChoiceRow>
        <ChoiceRow
          type="checkbox"
          checked={has_dependency_column && config.show_critical_path === true}
          disabled={is_read_only || !has_dependency_column}
          onChange={() => update({ show_critical_path: config.show_critical_path !== true })}
        >
          <span className="board-gantt-panel__label">Show critical path</span>
        </ChoiceRow>
        {!has_dependency_column && onAddDependencyColumn && !is_read_only && (
          <p className="board-gantt-panel__hint board-gantt-panel__hint--inset">
            Arrows and the critical path come from a Dependency column.{" "}
            <button type="button" className="board-gantt-panel__link" onClick={onAddDependencyColumn}>
              Add Dependency column
            </button>
          </p>
        )}
        <ChoiceRow
          type="checkbox"
          checked={has_baseline && config.show_baseline !== false}
          disabled={is_read_only || !has_baseline}
          onChange={() => update({ show_baseline: config.show_baseline === false })}
        >
          <span className="board-gantt-panel__label">Show baseline</span>
        </ChoiceRow>
        <ChoiceRow
          type="checkbox"
          checked={config.show_legend !== false}
          disabled={is_read_only}
          onChange={() => update({ show_legend: config.show_legend === false })}
        >
          <span className="board-gantt-panel__label">Show legend</span>
        </ChoiceRow>
        <ChoiceRow
          type="checkbox"
          checked={config.show_weekends !== false}
          disabled={is_read_only}
          onChange={() => update({ show_weekends: config.show_weekends === false })}
        >
          <span className="board-gantt-panel__label">Shade weekends</span>
          <span className="board-gantt-panel__meta">Days</span>
        </ChoiceRow>
      </section>
    </div>
  );
};

export type GanttBaselinePanelProps = {
  config: BoardGanttConfig;
  /** How many items have dates right now, the ones a new baseline would capture. */
  dated_item_count: number;
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onSave?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
};

const formatSavedAt = (saved_at: string): string => {
  const date = new Date(saved_at);
  return Number.isNaN(date.getTime())
    ? saved_at
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * The Baseline button's popover: save a snapshot of every item's dates and
 * compare it with the live timeline, a gray bar under each item.
 */
export const GanttBaselinePanel: React.FC<GanttBaselinePanelProps> = ({ config, dated_item_count, onSave, onToggle, onDelete }) => {
  const baseline = config.baseline ?? null;
  const is_shown = baseline !== null && config.show_baseline !== false;
  const captured_count = Object.keys(getBaselineItems(baseline)).length;

  return (
    <div className="board-gantt-popover board-gantt-panel" role="dialog" aria-label="Baseline">
      <div className="board-gantt-panel__heading">
        <span>Baseline</span>
      </div>
      <p className="board-gantt-panel__hint">
        Save a snapshot of the current timeline, then compare it with the live dates as your project moves.
      </p>

      {baseline ? (
        <>
          <div className="board-gantt-panel__card">
            <span className="board-gantt-panel__card-title">Saved {formatSavedAt(baseline.saved_at)}</span>
            <span className="board-gantt-panel__card-meta">
              {captured_count} {captured_count === 1 ? "item" : "items"}
              {baseline.saved_by ? ` · by ${baseline.saved_by}` : ""}
            </span>
          </div>
          <ChoiceRow type="checkbox" checked={is_shown} disabled={!onToggle} onChange={() => onToggle?.()}>
            <span className="board-gantt-panel__swatch board-gantt-panel__swatch--baseline" aria-hidden />
            <span className="board-gantt-panel__label">Show baseline</span>
          </ChoiceRow>
          {onSave && (
            <div className="board-gantt-panel__actions">
              <button type="button" className="board-gantt-panel__button board-gantt-panel__button--danger" onClick={onDelete}>
                Delete
              </button>
              <button type="button" className="board-gantt-panel__button" onClick={onSave} disabled={dated_item_count === 0}>
                Update baseline
              </button>
            </div>
          )}
        </>
      ) : onSave ? (
        <div className="board-gantt-panel__actions">
          <button type="button" className="board-gantt-panel__button board-gantt-panel__button--primary" onClick={onSave} disabled={dated_item_count === 0}>
            Save baseline
          </button>
        </div>
      ) : (
        <p className="board-gantt-panel__hint">No baseline has been saved for this view yet.</p>
      )}
      {dated_item_count === 0 && onSave && <p className="board-gantt-panel__hint">Add dates to some items to save a baseline.</p>}
    </div>
  );
};
