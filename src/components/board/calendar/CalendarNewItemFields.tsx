"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import PopoverPanel from "../table/menus/PopoverPanel";
import DateMenu from "../table/menus/DateMenu";
import StatusOptionGrid from "../cells/StatusOptionGrid";
import type { BoardCellOption, BoardOptionActions } from "../cells/BoardValueCell";
import { parseCalendarDate, formatEventTime } from "./calendarConfig";

/** A press on a trigger while its menu is open closes the menu on pointerdown, the click that follows must not reopen it. */
const REOPEN_GUARD_MS = 300;

/**
 * Open state for a field menu hosted in `PopoverPanel`, which leaves Escape to
 * its host: Escape closes the menu here and is stopped at the document, so the
 * dialog's own window listener only closes the dialog when no menu is open.
 */
const useFieldMenu = () => {
  const [is_open, setIsOpen] = useState(false);
  const last_closed_at_ref = useRef(0);

  const close = () => {
    last_closed_at_ref.current = Date.now();
    setIsOpen(false);
  };

  const toggle = () => {
    if (is_open) {
      close();
      return;
    }
    if (Date.now() - last_closed_at_ref.current < REOPEN_GUARD_MS) return;
    setIsOpen(true);
  };

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open]);

  return { is_open, toggle, close };
};

export type CalendarGroupOption = { id: number; label: string; color: string };

type GroupFieldProps = {
  groups: CalendarGroupOption[];
  selected_id: number | null;
  onSelect: (group_id: number) => void;
};

/** The Group row: a dot and the group's name, opening monday.com's searchable group list. */
export const NewItemGroupField: React.FC<GroupFieldProps> = ({ groups, selected_id, onSelect }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [highlight_index, setHighlightIndex] = useState(0);
  const search_ref = useRef<HTMLInputElement | null>(null);
  const list_ref = useRef<HTMLDivElement | null>(null);
  const is_open = anchor_el !== null;
  const selected_group = groups.find((group) => group.id === selected_id) ?? null;
  const normalized_query = query.trim().toLowerCase();
  const visible_groups = normalized_query ? groups.filter((group) => group.label.toLowerCase().includes(normalized_query)) : groups;

  // BoardPopover hides its first frame while it measures itself, so the search box is focused on the next one.
  useEffect(() => {
    if (!is_open) return;
    const frame = requestAnimationFrame(() => search_ref.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [is_open]);

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>(`[data-index="${highlight_index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlight_index]);

  const close = () => {
    setAnchorEl(null);
    setQuery("");
  };

  const choose = (group_id: number) => {
    onSelect(group_id);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visible_groups.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlightIndex((index) => (index + step + visible_groups.length) % visible_groups.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const group = visible_groups[highlight_index];
      if (group) choose(group.id);
    }
  };

  return (
    <>
      <button
        type="button"
        className="calendar-new-item__value calendar-new-item__group-value"
        onClick={(event) => {
          if (is_open) {
            close();
            return;
          }
          setHighlightIndex(Math.max(0, groups.findIndex((group) => group.id === selected_id)));
          setAnchorEl(event.currentTarget);
        }}
        aria-haspopup="listbox"
        aria-expanded={is_open}
      >
        <span className="calendar-new-item__group-dot" style={{ background: selected_group?.color ?? "#c4c4c4" }} />
        <span className="truncate">{selected_group?.label ?? "Choose a group"}</span>
      </button>
      <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={close} align="start" width={262} unstyled>
        <div className="calendar-new-item-menu calendar-new-item-group-menu">
          <label className="calendar-new-item-group-menu__search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 10.5 13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              ref={search_ref}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search group"
              aria-label="Search group"
              aria-controls="calendar-new-item-group-list"
            />
          </label>
          <div ref={list_ref} id="calendar-new-item-group-list" role="listbox" aria-label="Group" className="calendar-new-item-group-menu__list">
            {visible_groups.length === 0 && <p className="calendar-new-item-group-menu__empty">No groups found</p>}
            {visible_groups.map((group, index) => (
              <button
                key={group.id}
                type="button"
                role="option"
                data-index={index}
                aria-selected={group.id === selected_id}
                data-highlighted={index === highlight_index || undefined}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => choose(group.id)}
                className="calendar-new-item-group-menu__option"
              >
                <span className="calendar-new-item-group-menu__swatch" style={{ background: group.color }} />
                <span className="truncate">{group.label}</span>
              </button>
            ))}
          </div>
        </div>
      </BoardPopover>
    </>
  );
};

type StatusFieldProps = {
  label: string;
  options: BoardCellOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  option_actions?: BoardOptionActions;
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
};

/** A Status row: the label's color block (monday.com's gray when empty) opening the shared label grid under a caret. */
export const NewItemStatusField: React.FC<StatusFieldProps> = ({ label, options, value, onChange, option_actions, onCreateOption }) => {
  const menu = useFieldMenu();
  const option = options.find((candidate) => candidate.id === value) ?? null;
  const trigger_ref = useRef<HTMLButtonElement | null>(null);
  const menu_ref = useRef<HTMLDivElement | null>(null);
  const [is_above, setIsAbove] = useState(false);

  // PopoverPanel flips the grid above the field when there is no room below, the caret then has to point down.
  useLayoutEffect(() => {
    if (!menu.is_open) {
      setIsAbove(false);
      return;
    }
    let frame = 0;
    const measure = () => {
      const trigger_rect = trigger_ref.current?.getBoundingClientRect();
      const menu_rect = menu_ref.current?.getBoundingClientRect();
      if (trigger_rect && menu_rect) setIsAbove(menu_rect.bottom <= trigger_rect.top + 1);
    };
    // The panel settles its position over the next frames (measure, then nudge), so check again after them.
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => (frame = requestAnimationFrame(measure)));
    };
    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    const resize_observer = new ResizeObserver(scheduleMeasure);
    if (menu_ref.current) resize_observer.observe(menu_ref.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      resize_observer.disconnect();
    };
  }, [menu.is_open]);

  return (
    <div className="calendar-new-item__status">
      <button
        ref={trigger_ref}
        type="button"
        onClick={menu.toggle}
        aria-haspopup="listbox"
        aria-expanded={menu.is_open}
        aria-label={`${label}: ${option?.label ?? "No label"}`}
        className="calendar-new-item__status-trigger"
        style={option ? { background: option.color } : undefined}
      >
        <span className="truncate">{option?.label ?? ""}</span>
      </button>
      {menu.is_open && (
        <PopoverPanel onClose={menu.close} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
          <div ref={menu_ref} className="calendar-new-item-status-menu" data-placement={is_above ? "top" : "bottom"}>
            <StatusOptionGrid
              options={options}
              full_options={options}
              selected_id={value}
              onPick={(option_id) => {
                onChange(option_id);
                menu.close();
              }}
              option_actions={option_actions}
              onCreateOption={onCreateOption}
            />
          </div>
        </PopoverPanel>
      )}
    </div>
  );
};

/** "Oct 7", with the year outside the current one and the time when the date has one, like monday.com's date cell. */
const formatDateLabel = (value: string): string => {
  const parsed = parseCalendarDate(value);
  if (!parsed) return value;
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (parsed.date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  const day_label = parsed.date.toLocaleDateString("en-US", options);
  return parsed.has_time ? `${day_label}, ${formatEventTime(parsed.date)}` : day_label;
};

type DateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

/** A Date row opening the table's monday.com date picker (Today, optional time, typed date, Month/Year, day grid). */
export const NewItemDateField: React.FC<DateFieldProps> = ({ label, value, onChange }) => {
  const menu = useFieldMenu();

  return (
    <div className="calendar-new-item__date">
      <button
        type="button"
        onClick={menu.toggle}
        aria-haspopup="dialog"
        aria-expanded={menu.is_open}
        aria-label={`${label}: ${value ? formatDateLabel(value) : "No date"}`}
        className="calendar-new-item__date-trigger"
      >
        <span className="truncate">{value ? formatDateLabel(value) : ""}</span>
      </button>
      {menu.is_open && <DateMenu selected_iso={value ?? undefined} onPick={onChange} onClear={() => onChange(null)} onClose={menu.close} />}
    </div>
  );
};
