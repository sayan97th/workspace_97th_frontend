"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/icons/board-icons";
import type { BoardColumnKind } from "../columnTypes";
import StatusPill from "../StatusPill";
import ProductTag, { OverflowBadge } from "../ProductTag";
import PersonAvatarStack from "../PersonAvatarStack";
import PersonAvatar from "../PersonAvatar";
import BoardPopover from "../toolbar/BoardPopover";
import OptionPicker, { type BoardCellOption } from "./OptionPicker";

export type { BoardCellOption };

/** A cell value, shaped per the owning column's kind. */
export type BoardCellValue = string | number | boolean | string[] | null;

/** The subset of a column a cell editor needs — decoupled from the engine's DTO. */
export type BoardCellColumn = {
  id: string;
  kind: BoardColumnKind;
  options?: BoardCellOption[];
};

/** A board member the People cell can assign. */
export type BoardCellPerson = { id: number | string; full_name: string; profile_photo_url?: string | null };

export type BoardValueCellProps = {
  column: BoardCellColumn;
  value: BoardCellValue;
  /** All assignable board members (People columns). */
  people?: BoardCellPerson[];
  /** Persists a new cell value. */
  onCommit: (value: BoardCellValue) => void;
  /** Adds an option to a status/dropdown column and resolves to it so the cell can select it. */
  onAddOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Whether the cell paints edge-to-edge (status columns). */
  bleed?: boolean;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Normalizes any stored date value to the YYYY-MM-DD an <input type="date"> expects. */
const toDateInputValue = (value: BoardCellValue): string => {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

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
      bleed ? "" : "rounded-[4px] hover:bg-shell-hover/60"
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
  onCommit,
  onAddOption,
  bleed,
}) => {
  switch (column.kind) {
    case "checkbox":
      return <CheckboxCell value={value} onCommit={onCommit} />;
    case "number":
      return <TextInputCell value={value} onCommit={onCommit} numeric />;
    case "date":
      return <DateCell value={value} onCommit={onCommit} />;
    case "status":
      return <StatusCell column={column} value={value} onCommit={onCommit} onAddOption={onAddOption} bleed={bleed} />;
    case "tags":
      return <DropdownCell column={column} value={value} onCommit={onCommit} onAddOption={onAddOption} />;
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
        className={`h-full w-full min-w-0 rounded-[4px] border border-brand-500 bg-shell-bg px-1.5 text-[12.5px] text-shell-text outline-none ${
          numeric ? "text-center" : ""
        }`}
      />
    );
  }

  return (
    <EditableSurface onClick={startEditing}>
      {value != null && String(value) !== "" ? (
        <span className={`min-w-0 truncate text-[12.5px] text-shell-text-secondary ${numeric ? "w-full text-center" : ""}`}>
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
        className="h-full w-full min-w-0 rounded-[4px] border border-brand-500 bg-shell-bg px-1.5 text-[12.5px] text-shell-text outline-none"
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
        <span className="text-[12.5px] text-shell-text-secondary">{formatDate(value)}</span>
      ) : (
        <span className="text-[12.5px] text-transparent">—</span>
      )}
    </EditableSurface>
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
      className="flex h-[18px] w-[18px] items-center justify-center rounded"
      style={checked ? { background: "#00c875" } : { border: "1.5px solid var(--color-shell-border-strong)" }}
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
  bleed?: boolean;
}> = ({ column, value, onCommit, onAddOption, bleed }) => {
  const popover = usePopoverAnchor();
  const options = column.options ?? [];
  const selected = typeof value === "string" ? value : null;
  const option = options.find((o) => o.id === selected) ?? null;

  return (
    <>
      <div className="h-full w-full" onClick={popover.open}>
        {option ? (
          <StatusPill label={option.label} bg={option.color} color="#ffffff" />
        ) : (
          <div className="flex h-full w-full cursor-pointer items-center justify-center bg-shell-panel-alt text-[12.5px] text-transparent hover:bg-shell-hover">
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
}> = ({ column, value, onCommit, onAddOption }) => {
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
          <PersonAvatarStack people={selected} empty_label="—" />
        ) : (
          <span className="text-[12.5px] text-transparent">—</span>
        )}
      </EditableSurface>
      <BoardPopover anchor_el={popover.anchor_el} is_open={popover.is_open} onClose={popover.close} align="start" width={240}>
        <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto p-2" onClick={(event) => event.stopPropagation()}>
          {people.length === 0 && (
            <p className="px-1 py-3 text-center text-[12.5px] text-shell-text-faint">No members to assign.</p>
          )}
          {people.map((person, index) => {
            const is_selected = selected_ids.includes(String(person.id));
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => toggle(String(person.id))}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-shell-hover"
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
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-shell-text">{person.full_name}</span>
                {is_selected && (
                  <span className="flex-none text-brand-500">
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
