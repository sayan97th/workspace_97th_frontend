"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import BoardValueCell, {
  type BoardCellOption,
  type BoardCellPerson,
  type BoardCellValue,
  type BoardOptionActions,
} from "../cells/BoardValueCell";
import KanbanPeopleField from "../kanban/KanbanPeopleField";
import ColumnTypeIcon from "../table/menus/ColumnTypeIcon";
import { COLUMN_TYPE_GALLERY } from "../table/constants";
import type { ColumnKind, PersonDef } from "../table/types";
import type { BoardColumnKind } from "../columnTypes";
import { CheckIcon } from "@/icons/board-icons";
import "@/components/ui/dropdown/action-menu.css";
import "./calendar-new-item-dialog.css";

/** One column the dialog lets the viewer fill in before the item exists. */
export type CalendarNewItemField = {
  id: string;
  label: string;
  kind: BoardColumnKind;
  /** The Column Types gallery kind drawn as the colored chip beside the label, null for a plain chip. */
  icon_kind: ColumnKind | null;
  options?: BoardCellOption[];
  /** The column's description, shown behind the (i) beside its label. */
  description?: string | null;
  pill_style?: "solid" | "outline";
};

export type CalendarNewItemGroup = { id: number; label: string; color: string };

export type CalendarNewItemPayload = {
  name: string;
  group_id: number;
  values: Record<string, BoardCellValue>;
};

export type CalendarNewItemDialogProps = {
  /** Closed while null. Changing it (a new "+ Add") starts a fresh draft. */
  draft_key: string | null;
  groups: CalendarNewItemGroup[];
  initial_group_id: number | null;
  fields: CalendarNewItemField[];
  /** Prefilled values, the clicked day in the calendar's date column. */
  initial_values: Record<string, BoardCellValue>;
  /** Avatars for People values. */
  people: BoardCellPerson[];
  /** The table's People picker roster and its "Notify assigned people" switch. */
  people_picker: {
    people: PersonDef[];
    getNotifyOnAssignment: (column_id: string) => boolean;
    onToggleNotifyOnAssignment: (column_id: string) => void;
  };
  onAddOption?: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  onEditOptions?: (column_id: string) => BoardOptionActions | undefined;
  onClose: () => void;
  onCreate: (payload: CalendarNewItemPayload) => Promise<void>;
};

const DEFAULT_ITEM_NAME = "New Item";
const BLEED_KINDS = new Set<BoardColumnKind>(["status", "label"]);
const OPTION_KINDS = new Set<BoardColumnKind>(["status", "label", "tags", "dropdown"]);
/** Group chip color, monday.com's yellow. */
const GROUP_ACCENT = "#ffcb00";

/** Chip color per kind. Presets (Priority is a yellow Status column) come after their base kind and must not override it. */
const KIND_ACCENTS = new Map<ColumnKind, string>();
for (const type of COLUMN_TYPE_GALLERY) {
  if (!type.glyph && !KIND_ACCENTS.has(type.kind)) KIND_ACCENTS.set(type.kind, type.accent);
}

/** A People value as a list of ids, whatever shape it was stored in. */
const toIdList = (value: BoardCellValue | undefined): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" || typeof value === "number") return value === "" ? [] : [String(value)];
  return [];
};

const isEmptyValue = (value: BoardCellValue | undefined): boolean =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

/**
 * monday.com's "New Item" dialog, opened by a calendar day's "+ Add": an
 * editable item name, the group, then one row per board column (People,
 * Status, Date...) edited with the same pickers as the table. Nothing is
 * saved until "Create Task".
 */
const CalendarNewItemDialog: React.FC<CalendarNewItemDialogProps> = ({
  draft_key,
  groups,
  initial_group_id,
  fields,
  initial_values,
  people,
  people_picker,
  onAddOption,
  onEditOptions,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState(DEFAULT_ITEM_NAME);
  const [group_id, setGroupId] = useState<number | null>(initial_group_id);
  const [values, setValues] = useState<Record<string, BoardCellValue>>(initial_values);
  const [is_saving, setIsSaving] = useState(false);
  const [group_anchor_el, setGroupAnchorEl] = useState<HTMLElement | null>(null);
  const name_ref = useRef<HTMLInputElement | null>(null);
  const is_open = draft_key !== null;

  // A new "+ Add" starts from a clean draft with that day prefilled.
  useEffect(() => {
    if (draft_key === null) return;
    setName(DEFAULT_ITEM_NAME);
    setGroupId(initial_group_id);
    setValues(initial_values);
    setIsSaving(false);
    const frame = requestAnimationFrame(() => name_ref.current?.select());
    return () => cancelAnimationFrame(frame);
    // Only a new draft resets it, the initial props are recreated on every board render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft_key]);

  // Pickers opened from a field stop their own Escape at the document, so this only fires when none is open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_saving, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  const selected_group = groups.find((group) => group.id === group_id) ?? null;

  const setValue = (column_id: string, value: BoardCellValue) =>
    setValues((current) => ({ ...current, [column_id]: value }));

  const create = async () => {
    if (group_id === null || is_saving) return;
    setIsSaving(true);
    try {
      const filled_values = Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmptyValue(value)));
      await onCreate({ name: name.trim() || DEFAULT_ITEM_NAME, group_id, values: filled_values });
      onClose();
    } catch {
      // The board already shows the error toast, the draft stays so nothing typed is lost.
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="calendar-new-item-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !is_saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-new-item-title"
        className="calendar-new-item board-table-theme board-chrome-theme"
      >
        <div className="calendar-new-item__top">
          <Tooltip content="Close" placement="bottom">
            <button type="button" onClick={onClose} aria-label="Close" className="calendar-new-item__icon-button" disabled={is_saving}>
              <X size={20} strokeWidth={1.75} />
            </button>
          </Tooltip>
        </div>

        {/* Not a <form>: Enter inside a field's own editor commits that field, it must not create the item. */}
        <div className="calendar-new-item__body">
          <h2 id="calendar-new-item-title" className="sr-only">
            New item
          </h2>
          <input
            ref={name_ref}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => !name.trim() && setName(DEFAULT_ITEM_NAME)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
            }}
            aria-label="Item name"
            maxLength={255}
            className="calendar-new-item__name font-heading"
          />

          <div className="calendar-new-item__fields">
            <div className="calendar-new-item__label">
              <span className="calendar-new-item__group-chip" style={{ background: GROUP_ACCENT }} aria-hidden>
                <span />
              </span>
              <span className="calendar-new-item__label-text">Group</span>
            </div>
            <button
              type="button"
              className="calendar-new-item__value calendar-new-item__group-value"
              onClick={(event) => setGroupAnchorEl(event.currentTarget)}
              aria-haspopup="listbox"
              aria-expanded={group_anchor_el !== null}
            >
              <span className="calendar-new-item__group-dot" style={{ background: selected_group?.color ?? "#c4c4c4" }} />
              <span className="truncate">{selected_group?.label ?? "Choose a group"}</span>
            </button>
            <BoardPopover anchor_el={group_anchor_el} is_open={group_anchor_el !== null} onClose={() => setGroupAnchorEl(null)} align="start" width={300} unstyled>
              <div className="action-menu" role="listbox" aria-label="Group">
                <div className="action-menu__title">Choose a group</div>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    role="option"
                    aria-selected={group.id === group_id}
                    className="action-menu__item"
                    onClick={() => {
                      setGroupId(group.id);
                      setGroupAnchorEl(null);
                    }}
                  >
                    <span className="action-menu__icon">
                      <span className="calendar-new-item__group-dot" style={{ background: group.color }} />
                    </span>
                    <span className="action-menu__label">{group.label}</span>
                    {group.id === group_id && <CheckIcon size={12} />}
                  </button>
                ))}
              </div>
            </BoardPopover>

            {fields.map((field) => {
              const is_bleed = BLEED_KINDS.has(field.kind) && field.pill_style !== "outline";
              const has_options = OPTION_KINDS.has(field.kind);
              return (
                <React.Fragment key={field.id}>
                  <div className="calendar-new-item__label">
                    {field.icon_kind ? (
                      <ColumnTypeIcon kind={field.icon_kind} accent={KIND_ACCENTS.get(field.icon_kind) ?? "#579bfc"} size={20} />
                    ) : (
                      <span className="calendar-new-item__group-chip" style={{ background: "#579bfc" }} aria-hidden />
                    )}
                    <span className="calendar-new-item__label-text" title={field.label}>
                      {field.label}
                    </span>
                    {field.description && (
                      <Tooltip content={field.description}>
                        <span className="calendar-new-item__info" tabIndex={0} aria-label={`About ${field.label}: ${field.description}`}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M8 7.2v3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            <circle cx="8" cy="5.1" r="0.8" fill="currentColor" />
                          </svg>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  <div className="calendar-new-item__value" data-bleed={is_bleed || undefined} data-kind={field.kind}>
                    {field.kind === "people" ? (
                      <KanbanPeopleField
                        people={people_picker.people}
                        selected_ids={toIdList(values[field.id])}
                        onSave={(person_ids) => setValue(field.id, person_ids.length ? person_ids : null)}
                        notify_on_assignment={people_picker.getNotifyOnAssignment(field.id)}
                        onToggleNotifyOnAssignment={() => people_picker.onToggleNotifyOnAssignment(field.id)}
                      />
                    ) : (
                      <BoardValueCell
                        column={{ id: field.id, kind: field.kind, options: field.options }}
                        value={values[field.id] ?? null}
                        people={people}
                        onCommit={(value) => setValue(field.id, value)}
                        onAddOption={has_options && onAddOption ? (option) => onAddOption(field.id, option) : undefined}
                        onEditOptions={has_options ? onEditOptions?.(field.id) : undefined}
                        bleed={is_bleed}
                        pill_style={field.pill_style}
                      />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="calendar-new-item__footer">
            <button type="button" onClick={onClose} disabled={is_saving} className="calendar-new-item__button calendar-new-item__button--ghost">
              Cancel
            </button>
            <button type="button" onClick={() => void create()} disabled={is_saving || group_id === null} className="calendar-new-item__button calendar-new-item__button--primary">
              {is_saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalendarNewItemDialog;
