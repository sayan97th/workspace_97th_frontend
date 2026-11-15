"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import PersonAvatar from "../PersonAvatar";
import { KanbanColumnIcon } from "../kanban/kanbanColumnIcons";
import type { BoardActivityEventType, BoardActivityFacets, BoardActivityFilters, BoardActivityPeriod } from "@/types/board-activity-log";
import { EVENT_TYPE_OPTIONS, PERIOD_OPTIONS, toAvatarPerson } from "./activityLogFormat";

/**
 * A panel that drops down under a toolbar button and closes on Escape or a
 * click outside of it (the trigger itself is left to toggle it).
 */
export const ActivityLogPopover: React.FC<{
  is_open: boolean;
  onClose: () => void;
  trigger_ref: React.RefObject<HTMLElement | null>;
  label: string;
  class_name?: string;
  children: React.ReactNode;
}> = ({ is_open, onClose, trigger_ref, label, class_name, children }) => {
  const panel_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel_ref.current?.contains(target) || trigger_ref.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
      trigger_ref.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [is_open, onClose, trigger_ref]);

  if (!is_open) return null;
  return (
    <div ref={panel_ref} role="dialog" aria-label={label} className={`activity-log__popover ${class_name ?? ""}`}>
      {children}
    </div>
  );
};

const toggleIn = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);

const CheckOption: React.FC<{ is_checked: boolean; onToggle: () => void; children: React.ReactNode }> = ({ is_checked, onToggle, children }) => (
  <button type="button" role="menuitemcheckbox" aria-checked={is_checked} className="activity-log__option" onClick={onToggle}>
    <span className="activity-log__checkbox" data-checked={is_checked || undefined} aria-hidden="true">
      {is_checked && <Check size={11} strokeWidth={3} />}
    </span>
    {children}
  </button>
);

export type ActivityLogFilterPanelProps = {
  filters: BoardActivityFilters;
  facets: BoardActivityFacets | null;
  onChange: (patch: Partial<BoardActivityFilters>) => void;
  onClearAll: () => void;
};

/**
 * "Filter log": date range, event types, columns and groups, each section
 * multi select. Columns and groups share one search box, like monday's.
 */
export const ActivityLogFilterPanel: React.FC<ActivityLogFilterPanelProps> = ({ filters, facets, onChange, onClearAll }) => {
  const [query, setQuery] = useState("");
  const normalized_query = query.trim().toLowerCase();

  const columns = useMemo(() => {
    // Every tab has its own copy of a column, one entry per label and type is enough to pick from.
    const seen = new Map<string, { ids: number[]; label: string; type: string }>();
    for (const column of facets?.columns ?? []) {
      const key = `${column.label.toLowerCase()}|${column.type}`;
      const current = seen.get(key);
      if (current) current.ids.push(column.id);
      else seen.set(key, { ids: [column.id], label: column.label, type: column.type });
    }
    return Array.from(seen.values()).filter((column) => !normalized_query || column.label.toLowerCase().includes(normalized_query));
  }, [facets, normalized_query]);

  const groups = useMemo(
    () => (facets?.groups ?? []).filter((group) => !normalized_query || group.name.toLowerCase().includes(normalized_query)),
    [facets, normalized_query]
  );

  const toggleColumn = (ids: number[]) => {
    const is_selected = ids.every((id) => filters.column_ids.includes(id));
    onChange({ column_ids: is_selected ? filters.column_ids.filter((id) => !ids.includes(id)) : [...new Set([...filters.column_ids, ...ids])] });
  };

  return (
    <div className="activity-log__filter-panel">
      <div className="activity-log__filter-head">
        <span className="activity-log__filter-title">Filter log</span>
        <button type="button" className="activity-log__text-button" onClick={onClearAll}>
          Clear all
        </button>
      </div>

      <section className="activity-log__filter-section">
        <h4 className="activity-log__filter-heading">Date</h4>
        <div className="activity-log__pill-row" role="radiogroup" aria-label="Date">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={filters.period === option.value}
              className="activity-log__pill"
              data-active={filters.period === option.value || undefined}
              onClick={() => onChange({ period: option.value as BoardActivityPeriod })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="activity-log__filter-section">
        <h4 className="activity-log__filter-heading">Event type</h4>
        <div className="activity-log__pill-row">
          {EVENT_TYPE_OPTIONS.map((option) => {
            const is_active = filters.event_types.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={is_active}
                className="activity-log__pill"
                data-active={is_active || undefined}
                onClick={() => onChange({ event_types: toggleIn<BoardActivityEventType>(filters.event_types, option.value) })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <label className="activity-log__panel-search">
        <Search size={14} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search columns and groups" aria-label="Search columns and groups" />
      </label>

      <div className="activity-log__filter-columns shell-scrollbar">
        <section className="activity-log__filter-section">
          <h4 className="activity-log__filter-heading">Columns</h4>
          {columns.length === 0 && <p className="activity-log__panel-empty">No columns match.</p>}
          {columns.map((column) => (
            <CheckOption key={`${column.label}|${column.type}`} is_checked={column.ids.every((id) => filters.column_ids.includes(id))} onToggle={() => toggleColumn(column.ids)}>
              <span className="activity-log__option-icon" aria-hidden="true">
                <KanbanColumnIcon kind={column.type} size={14} />
              </span>
              <span className="activity-log__option-label">{column.label}</span>
            </CheckOption>
          ))}
        </section>

        <section className="activity-log__filter-section">
          <h4 className="activity-log__filter-heading">Groups</h4>
          {groups.length === 0 && <p className="activity-log__panel-empty">No groups match.</p>}
          {groups.map((group) => (
            <CheckOption key={group.id} is_checked={filters.group_ids.includes(group.id)} onToggle={() => onChange({ group_ids: toggleIn(filters.group_ids, group.id) })}>
              <span className="activity-log__group-dot" style={{ background: group.color ?? "#c4c4c4" }} aria-hidden="true" />
              <span className="activity-log__option-label">{group.name}</span>
              {group.is_archived && <span className="activity-log__option-hint">Archived</span>}
            </CheckOption>
          ))}
        </section>
      </div>
    </div>
  );
};

export type ActivityLogPersonPanelProps = {
  selected_ids: number[];
  facets: BoardActivityFacets | null;
  current_user_id: number | null;
  onChange: (user_ids: number[]) => void;
};

/** "Person": only what the picked people did. */
export const ActivityLogPersonPanel: React.FC<ActivityLogPersonPanelProps> = ({ selected_ids, facets, current_user_id, onChange }) => {
  const [query, setQuery] = useState("");
  const normalized_query = query.trim().toLowerCase();
  const people = (facets?.people ?? []).filter((person) => !normalized_query || person.full_name.toLowerCase().includes(normalized_query));

  return (
    <div className="activity-log__person-panel">
      <div className="activity-log__filter-head">
        <span className="activity-log__filter-title">Filter by person</span>
        {selected_ids.length > 0 && (
          <button type="button" className="activity-log__text-button" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <label className="activity-log__panel-search">
        <Search size={14} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names" aria-label="Search names" autoFocus />
      </label>
      <div className="activity-log__person-list shell-scrollbar">
        {people.length === 0 && <p className="activity-log__panel-empty">{facets ? "Nobody matches." : "Loading..."}</p>}
        {people.map((person) => (
          <CheckOption key={person.id} is_checked={selected_ids.includes(person.id)} onToggle={() => onChange(toggleIn(selected_ids, person.id))}>
            <PersonAvatar person={toAvatarPerson(person)} size={24} />
            <span className="activity-log__option-label">{person.full_name}</span>
            {person.id === current_user_id && <span className="activity-log__option-hint">You</span>}
          </CheckOption>
        ))}
      </div>
    </div>
  );
};
