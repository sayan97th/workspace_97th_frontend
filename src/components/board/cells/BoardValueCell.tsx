"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, LinkIcon } from "@/icons/board-icons";
import type { BoardColumnKind } from "../columnTypes";
import StatusPill from "../StatusPill";
import ProductTag, { OverflowBadge } from "../ProductTag";
import PersonAvatarStack from "../PersonAvatarStack";
import PersonAvatar from "../PersonAvatar";
import BoardPopover from "../toolbar/BoardPopover";
import OptionPicker, { type BoardCellOption, type BoardOptionActions } from "./OptionPicker";

export type { BoardCellOption, BoardOptionActions };

/** A `timeline`-type column's value — both `YYYY-MM-DD`. */
export type BoardCellTimelineValue = { start: string; end: string };

/** A cell value, shaped per the owning column's kind. */
export type BoardCellValue = string | number | boolean | string[] | BoardCellTimelineValue | null;

/** The subset of a column a cell editor needs — decoupled from the engine's DTO. */
export type BoardCellColumn = {
  id: string;
  kind: BoardColumnKind;
  options?: BoardCellOption[];
};

/** A board member the People cell can assign. */
export type BoardCellPerson = { id: number | string; full_name: string; profile_photo_url?: string | null };

/** An item the Dependency cell can link to as a predecessor. */
export type BoardCellItemOption = { id: string; name: string };

export type BoardValueCellProps = {
  column: BoardCellColumn;
  value: BoardCellValue;
  /** All assignable board members (People columns). */
  people?: BoardCellPerson[];
  /** Every other item this cell's Dependency column can link to as a predecessor — the caller is responsible for excluding the row itself and any candidate that would form a cycle. */
  items?: BoardCellItemOption[];
  /** Persists a new cell value. */
  onCommit: (value: BoardCellValue) => void;
  /** Adds an option to a status/dropdown column and resolves to it so the cell can select it. */
  onAddOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Rename/recolor/delete/deactivate/describe an existing status/dropdown option — unlocks "Edit Labels". */
  onEditOptions?: BoardOptionActions;
  /** Whether the cell paints edge-to-edge (status columns). */
  bleed?: boolean;
  /** Status-column pill treatment — `"outline"` renders a bordered pill (e.g. Priority) instead of the default full-bleed fill. See `BoardColumn.pill_style`. */
  pill_style?: "solid" | "outline";
};

/**
 * Parses a `YYYY-MM-DD` (or full ISO timestamp) column value into a
 * local-midnight `Date` using its raw digits — local, not UTC, components —
 * so a stored date renders as the day a viewer actually expects regardless
 * of timezone. A bare date-only string parses as UTC midnight per the ISO
 * 8601 spec if handed to `new Date(value)` directly, which then displays as
 * the *previous* day in any timezone behind UTC. Mirrors `BoardCalendar`'s
 * and the Gantt view's own `parseIsoDate`.
 */
const parseIsoDateLocal = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string): string => {
  const date = parseIsoDateLocal(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** `Mar 4` — no year, for the tighter Timeline cell pill. */
const formatShortDate = (value: string): string => {
  const date = parseIsoDateLocal(value);
  return !date ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Normalizes any stored date value to the YYYY-MM-DD an <input type="date"> expects. */
const toDateInputValue = (value: BoardCellValue): string => {
  if (typeof value !== "string" || !value) return "";
  const date = parseIsoDateLocal(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const asTimelineValue = (value: BoardCellValue): BoardCellTimelineValue | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const asStringArray = (value: BoardCellValue): string[] =>
  Array.isArray(value) ? value.map(String) : [];

/** Full-height wrapper making a display cell look clickable-to-edit. */
const EditableSurface: React.FC<{
  onClick: (event: React.MouseEvent) => void;
  bleed?: boolean;
  children: React.ReactNode;
}> = ({ onClick, bleed, children }) => (
  <div
    onClick={onClick}
    className={`flex h-full w-full min-w-0 cursor-pointer items-center ${
      bleed ? "" : "rounded-[4px] hover:bg-boardtree-hover/60"
    }`}
  >
    {children}
  </div>
);

/**
 * Renders a single board cell for a typed column, both its display and its
 * inline editor. Each cell owns its own edit state, so a board view just maps
 * every non-name column to a `<BoardValueCell>` — no central editing state.
 * Text/number/date edit in place; status/dropdown/people open an anchored
 * picker; checkbox toggles on click.
 */
const BoardValueCell: React.FC<BoardValueCellProps> = ({
  column,
  value,
  people = [],
  items = [],
  onCommit,
  onAddOption,
  onEditOptions,
  bleed,
  pill_style,
}) => {
  switch (column.kind) {
    case "checkbox":
      return <CheckboxCell value={value} onCommit={onCommit} />;
    case "number":
      return <TextInputCell value={value} onCommit={onCommit} numeric />;
    case "date":
      return <DateCell value={value} onCommit={onCommit} />;
    case "timeline":
      return <TimelineCell value={value} onCommit={onCommit} />;
    case "dependency":
      return <DependencyCell value={value} items={items} onCommit={onCommit} />;
    case "status":
      return (
        <StatusCell
          column={column}
          value={value}
          onCommit={onCommit}
          onAddOption={onAddOption}
          onEditOptions={onEditOptions}
          bleed={bleed}
          pill_style={pill_style}
        />
      );
    case "tags":
      return (
        <DropdownCell
          column={column}
          value={value}
          onCommit={onCommit}
          onAddOption={onAddOption}
          onEditOptions={onEditOptions}
        />
      );
    case "people":
      return <PeopleCell value={value} people={people} onCommit={onCommit} />;
    case "text":
    default:
      return <TextInputCell value={value} onCommit={onCommit} />;
  }
};

export default BoardValueCell;

// ─────────────────────────────────────────────────────────────────────────────
// Text / Number
// ─────────────────────────────────────────────────────────────────────────────

const TextInputCell: React.FC<{
  value: BoardCellValue;
  onCommit: (value: BoardCellValue) => void;
  numeric?: boolean;
}> = ({ value, onCommit, numeric }) => {
  const [is_editing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_editing) input_ref.current?.focus();
  }, [is_editing]);

  const startEditing = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDraft(value == null ? "" : String(value));
    setIsEditing(true);
  };

  const commit = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (numeric) {
      const next = trimmed === "" ? null : Number(trimmed);
      if (next !== null && Number.isNaN(next)) return; // ignore non-numeric input
      if (next !== (typeof value === "number" ? value : value == null ? null : Number(value))) onCommit(next);
      return;
    }
    if (trimmed !== (value == null ? "" : String(value))) onCommit(trimmed === "" ? null : trimmed);
  };

  if (is_editing) {
    return (
      <input
        ref={input_ref}
        value={draft}
        inputMode={numeric ? "decimal" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsEditing(false);
          }
        }}
        onBlur={commit}
        className={`h-full w-full min-w-0 rounded-[4px] border border-boardtree-accent bg-boardtree-surface px-1.5 text-[12.5px] text-boardtree-text outline-none ${
          numeric ? "text-center" : ""
        }`}
      />
    );
  }

  return (
    <EditableSurface onClick={startEditing}>
      {value != null && String(value) !== "" ? (
        <span className={`min-w-0 truncate text-[12.5px] text-boardtree-text-secondary ${numeric ? "w-full text-center" : ""}`}>
          {String(value)}
        </span>
      ) : (
        <span className="text-[12.5px] text-transparent">—</span>
      )}
    </EditableSurface>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Date
// ─────────────────────────────────────────────────────────────────────────────

const DateCell: React.FC<{ value: BoardCellValue; onCommit: (value: BoardCellValue) => void }> = ({
  value,
  onCommit,
}) => {
  const [is_editing, setIsEditing] = useState(false);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_editing) input_ref.current?.focus();
  }, [is_editing]);

  if (is_editing) {
    return (
      <input
        ref={input_ref}
        type="date"
        defaultValue={toDateInputValue(value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsEditing(false);
        }}
        onChange={(event) => {
          onCommit(event.target.value || null);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
        className="h-full w-full min-w-0 rounded-[4px] border border-boardtree-accent bg-boardtree-surface px-1.5 text-[12.5px] text-boardtree-text outline-none"
      />
    );
  }

  return (
    <EditableSurface
      onClick={(event) => {
        event.stopPropagation();
        setIsEditing(true);
      }}
    >
      {typeof value === "string" && value ? (
        <span className="text-[12.5px] text-boardtree-text-secondary">{formatDate(value)}</span>
      ) : (
        <span className="text-[12.5px] text-transparent">—</span>
      )}
    </EditableSurface>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline (start + end date — what the Gantt view's bars are driven by)
// ─────────────────────────────────────────────────────────────────────────────

const TimelineCell: React.FC<{ value: BoardCellValue; onCommit: (value: BoardCellValue) => void }> = ({
  value,
  onCommit,
}) => {
  const popover = usePopoverAnchor();
  const range = asTimelineValue(value);

  const commitRange = (start: string, end: string) => {
    if (!start) {
      onCommit(null);
      return;
    }
    // An end before the (possibly just-changed) start isn't a valid range —
    // collapse it to a single-day milestone instead of silently swapping the
    // two, which would surprise whichever end the user didn't just touch.
    onCommit({ start, end: end && end >= start ? end : start });
  };

  return (
    <>
      <EditableSurface onClick={popover.open}>
        {range ? (
          <span className="truncate text-[12.5px] text-boardtree-text-secondary">
            {formatShortDate(range.start)}
            {range.end !== range.start ? ` → ${formatShortDate(range.end)}` : " (milestone)"}
          </span>
        ) : (
          <span className="text-[12.5px] text-transparent">—</span>
        )}
      </EditableSurface>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={230}>
        <div className="flex flex-col gap-2.5 p-3" onClick={(event) => event.stopPropagation()}>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-boardtree-text-muted">
            Start
            <input
              type="date"
              value={range?.start ?? ""}
              onChange={(event) => commitRange(event.target.value, range?.end ?? event.target.value)}
              className="rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 py-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-boardtree-text-muted">
            End
            <input
              type="date"
              value={range?.end ?? ""}
              disabled={!range}
              onChange={(event) => commitRange(range?.start ?? "", event.target.value)}
              className="rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 py-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent disabled:opacity-50"
            />
          </label>
          {range && (
            <button
              type="button"
              onClick={() => onCommit({ start: range.start, end: range.start })}
              className="self-start text-[11.5px] font-semibold text-boardtree-accent hover:underline"
            >
              Set as milestone
            </button>
          )}
        </div>
      </BoardPopover>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox
// ─────────────────────────────────────────────────────────────────────────────

const CheckboxCell: React.FC<{ value: BoardCellValue; onCommit: (value: BoardCellValue) => void }> = ({
  value,
  onCommit,
}) => {
  const checked = value === true;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCommit(!checked);
      }}
      aria-label={checked ? "Uncheck" : "Check"}
      className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded"
      style={checked ? { background: "#00c875" } : { border: "1.5px solid var(--color-boardtree-border)" }}
    >
      {checked && <CheckIcon size={11} className="text-white" />}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Status (single-select) / Dropdown (multi-select)
// ─────────────────────────────────────────────────────────────────────────────

/** Shared open/anchor state for the three popover-based cell editors. */
const usePopoverAnchor = () => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  return {
    anchor_el,
    is_open: anchor_el !== null,
    open: (event: React.MouseEvent) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget as HTMLElement);
    },
    close: () => setAnchorEl(null),
  };
};

const StatusCell: React.FC<{
  column: BoardCellColumn;
  value: BoardCellValue;
  onCommit: (value: BoardCellValue) => void;
  onAddOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  onEditOptions?: BoardOptionActions;
  bleed?: boolean;
  pill_style?: "solid" | "outline";
}> = ({ column, value, onCommit, onAddOption, onEditOptions, bleed, pill_style = "solid" }) => {
  const popover = usePopoverAnchor();
  const options = column.options ?? [];
  const selected = typeof value === "string" ? value : null;
  const option = options.find((o) => o.id === selected) ?? null;

  return (
    <>
      <div className="h-full w-full cursor-pointer" onClick={popover.open}>
        {option ? (
          <StatusPill label={option.label} bg={option.color} color="#ffffff" variant={pill_style} />
        ) : (
          <div
            className={`flex h-full w-full cursor-pointer items-center justify-center text-[12.5px] text-transparent hover:bg-boardtree-hover ${
              bleed ? "bg-boardtree-panel-alt" : ""
            }`}
          >
            —
          </div>
        )}
      </div>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={240}>
        <OptionPicker
          options={options}
          selected_ids={selected ? [selected] : []}
          multi={false}
          onToggle={(option_id) => {
            onCommit(option_id === selected ? null : option_id);
            popover.close();
          }}
          onClear={() => {
            onCommit(null);
            popover.close();
          }}
          onCreateOption={onAddOption}
          option_actions={onEditOptions}
        />
      </BoardPopover>
    </>
  );
};

const DropdownCell: React.FC<{
  column: BoardCellColumn;
  value: BoardCellValue;
  onCommit: (value: BoardCellValue) => void;
  onAddOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  onEditOptions?: BoardOptionActions;
}> = ({ column, value, onCommit, onAddOption, onEditOptions }) => {
  const popover = usePopoverAnchor();
  const options = column.options ?? [];
  const selected_ids = asStringArray(value);
  const options_by_id = new Map(options.map((o) => [o.id, o]));
  const selected_options = selected_ids
    .map((id) => options_by_id.get(id))
    .filter((o): o is BoardCellOption => Boolean(o));
  const visible = selected_options.slice(0, 2);
  const overflow = selected_options.length - visible.length;

  const toggle = (option_id: string) => {
    const next = selected_ids.includes(option_id)
      ? selected_ids.filter((id) => id !== option_id)
      : [...selected_ids, option_id];
    onCommit(next.length ? next : null);
  };

  return (
    <>
      <EditableSurface onClick={popover.open}>
        {selected_options.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {visible.map((opt) => (
              <ProductTag key={opt.id} label={opt.label} />
            ))}
            {overflow > 0 && <OverflowBadge label={`+${overflow}`} />}
          </div>
        ) : (
          <span className="text-[12.5px] text-transparent">—</span>
        )}
      </EditableSurface>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={240}>
        <OptionPicker
          options={options}
          selected_ids={selected_ids}
          multi
          onToggle={toggle}
          onClear={() => onCommit(null)}
          onCreateOption={onAddOption}
          option_actions={onEditOptions}
        />
      </BoardPopover>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// People (multi-select)
// ─────────────────────────────────────────────────────────────────────────────

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const PeopleCell: React.FC<{
  value: BoardCellValue;
  people: BoardCellPerson[];
  onCommit: (value: BoardCellValue) => void;
}> = ({ value, people, onCommit }) => {
  const popover = usePopoverAnchor();
  const selected_ids = asStringArray(value);
  const selected = selected_ids
    .map((id) => people.find((p) => String(p.id) === id))
    .filter((p): p is BoardCellPerson => Boolean(p));

  const toggle = (person_id: string) => {
    const next = selected_ids.includes(person_id)
      ? selected_ids.filter((id) => id !== person_id)
      : [...selected_ids, person_id];
    onCommit(next.length ? next : null);
  };

  return (
    <>
      <EditableSurface onClick={popover.open}>
        {selected.length > 0 ? (
          <PersonAvatarStack
            people={selected}
            empty_label="—"
            variant="flat"
            ring_color="var(--color-boardtree-surface)"
            overflow_class="bg-boardtree-hover text-boardtree-text-secondary"
          />
        ) : (
          <span className="text-[12.5px] text-transparent">—</span>
        )}
      </EditableSurface>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={240}>
        <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto p-2" onClick={(event) => event.stopPropagation()}>
          {people.length === 0 ? (
            <p className="px-1 py-3 text-center text-[12.5px] text-boardtree-text-faint">No members to assign.</p>
          ) : (
            <p className="px-1.5 pb-1 text-[11px] font-medium text-boardtree-text-faint">Suggested people</p>
          )}
          {people.map((person, index) => {
            const is_selected = selected_ids.includes(String(person.id));
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => toggle(String(person.id))}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-boardtree-hover"
              >
                <PersonAvatar
                  person={{
                    id: String(person.id),
                    name: person.full_name,
                    initials: getInitials(person.full_name),
                    avatar_seed: index,
                    avatar_url: person.profile_photo_url ?? undefined,
                  }}
                  size={24}
                  variant="flat"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-boardtree-text">{person.full_name}</span>
                {is_selected && (
                  <span className="flex-none text-boardtree-accent">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </BoardPopover>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress (computed, read-only — % of a row's direct subitems checked done)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A thin filled bar + trailing `NN%`, matching the design's Progress column.
 * `percent === null` renders an em dash instead of a bar — a row with no
 * subitems and no "done" checkbox of its own has nothing real to compute a
 * percentage from, so this deliberately doesn't fabricate one (see
 * `PROGRESS_COLUMN_ID` in `TableBoardView.tsx`).
 */
export const BoardProgressCell: React.FC<{ percent: number | null }> = ({ percent }) => {
  if (percent === null) {
    return <span className="text-[12.5px] text-transparent">—</span>;
  }
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-boardtree-hover">
        <div
          className="h-[6px] rounded-[3px] bg-boardtree-accent transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-8 flex-none text-right font-boardtree-mono text-[10.5px] text-boardtree-text-faint">
        {percent}%
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dependency (multi-select predecessor items — drives the Gantt view's arrows)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The search + toggleable item list a Dependency picker popover shows —
 * shared by the full grid `DependencyCell` below and the Gantt view's own
 * compact "link" trigger (`GanttRowLabel` in `TableBoardView.tsx`), which
 * needs the same picker but can't reuse `DependencyCell` itself since its
 * trigger is a full-height grid cell, not a small inline badge.
 */
export const DependencyPickerList: React.FC<{
  items: BoardCellItemOption[];
  selected_ids: string[];
  onToggle: (item_id: string) => void;
}> = ({ items, selected_ids, onToggle }) => {
  const [search, setSearch] = useState("");
  const filtered_items = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col" onClick={(event) => event.stopPropagation()}>
      <div className="p-2 pb-1">
        <input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items…"
          className="w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2 py-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
        />
      </div>
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto p-2 pt-1">
        {filtered_items.length === 0 && (
          <p className="px-1 py-3 text-center text-[12.5px] text-boardtree-text-faint">
            {items.length === 0 ? "No other items to depend on yet." : "No matches."}
          </p>
        )}
        {filtered_items.map((item) => {
          const is_selected = selected_ids.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-boardtree-hover"
            >
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-boardtree-hover text-boardtree-text-muted">
                <LinkIcon size={12} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-boardtree-text">{item.name}</span>
              {is_selected && (
                <span className="flex-none text-boardtree-accent">
                  <CheckIcon size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DependencyCell: React.FC<{
  value: BoardCellValue;
  items: BoardCellItemOption[];
  onCommit: (value: BoardCellValue) => void;
}> = ({ value, items, onCommit }) => {
  const popover = usePopoverAnchor();
  const selected_ids = asStringArray(value);
  const selected = selected_ids
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is BoardCellItemOption => Boolean(item));
  const visible = selected.slice(0, 2);
  const overflow = selected.length - visible.length;

  const toggle = (item_id: string) => {
    const next = selected_ids.includes(item_id)
      ? selected_ids.filter((id) => id !== item_id)
      : [...selected_ids, item_id];
    onCommit(next.length ? next : null);
  };

  return (
    <>
      <EditableSurface onClick={popover.open}>
        {selected.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {visible.map((item) => (
              <span
                key={item.id}
                className="flex max-w-[110px] items-center gap-1 truncate rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] font-medium text-boardtree-text-secondary"
              >
                <LinkIcon size={10} className="flex-none" />
                <span className="truncate">{item.name}</span>
              </span>
            ))}
            {overflow > 0 && <OverflowBadge label={`+${overflow}`} />}
          </div>
        ) : (
          <span className="text-[12.5px] text-transparent">—</span>
        )}
      </EditableSurface>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={260}>
        <DependencyPickerList items={items} selected_ids={selected_ids} onToggle={toggle} />
      </BoardPopover>
    </>
  );
};
