"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import ActionMenu from "@/components/ui/dropdown/ActionMenu";
import { getApiErrorMessage } from "@/lib/api-error";
import { COLUMN_KIND_SWATCH } from "../../columnTypes";
import { contrastFg, findDef } from "../colorUtils";
import { fmtDate, fmtRange, parseRangeValue } from "../dateUtils";
import { useCellTooltip } from "../cells/CellTooltip";
import type { CellValue, LinkedItemDetail, LinkedItemField, LinkedItemRef, PersonDef } from "../types";
import type { BoardTableActions } from "../useBoardTable";
import AvatarBadge from "./AvatarBadge";
import StatusMenu from "./StatusMenu";
import { RatingDisplay } from "../cells/VoteRatingCells";
import "./linked-item-dialog.css";

const GROUP_SWATCH = { accent_color: "#fdab3d", glyph: "●" };
const EMPTY_PILL_COLOR = "#c4c4c4";
const MAX_AVATARS = 3;
/** Field kinds the card edits in place, saved on the connected item. */
const LABEL_KINDS = new Set(["status", "label"]);
const TEXT_KINDS = new Set(["text", "long_text", "phone", "email"]);

interface LinkedItemDialogProps {
  item_ref: LinkedItemRef;
  people: PersonDef[];
  actions: BoardTableActions;
}

/**
 * A connected item's card, monday.com style, opened from a Connect boards chip, the picker's
 * open button or a Mirror's item list. Shows the item name, "in -> Board", its group and every
 * field of its board, with Status/Label, text, number and checkbox fields editable in place
 * (saved on the connected item). The "..." menu offers "Start conversation" (the item's page,
 * where its updates live) and "Delete item".
 */
export default function LinkedItemDialog({ item_ref, people, actions }: LinkedItemDialogProps) {
  const [detail, setDetail] = useState<LinkedItemDetail | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [open_field_id, setOpenFieldId] = useState<string | null>(null);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_confirming_delete, setIsConfirmingDelete] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);
  const menu_button_ref = useRef<HTMLButtonElement>(null);
  const onClose = actions.closeLinkedItem;

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(null);
    actions
      .fetchLinkedItem(item_ref)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) setDetail(loaded);
        else setLoadError("Connected items open once the board is saved.");
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiErrorMessage(error, "This item could not be opened."));
      });
    return () => {
      cancelled = true;
    };
  }, [actions, item_ref]);

  // Escape steps back one layer: the label picker, the menu, the delete confirmation, then the card.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open_field_id) setOpenFieldId(null);
      else if (is_menu_open) setIsMenuOpen(false);
      else if (is_confirming_delete) setIsConfirmingDelete(false);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open_field_id, is_menu_open, is_confirming_delete, onClose]);

  const saveField = (field: LinkedItemField, value: CellValue) => {
    if (!detail) return;
    const previous = field.value;
    setSaveError(null);
    setDetail({ ...detail, fields: detail.fields.map((candidate) => (candidate.id === field.id ? { ...candidate, value } : candidate)) });
    Promise.resolve(actions.setLinkedItemValue(detail.board_id, detail.item_id, field.id, value)).catch((error) => {
      setSaveError(getApiErrorMessage(error, `"${field.label}" could not be saved.`));
      setDetail((current) => current && { ...current, fields: current.fields.map((candidate) => (candidate.id === field.id ? { ...candidate, value: previous } : candidate)) });
    });
  };

  const deleteItem = async () => {
    if (!detail) return;
    setIsDeleting(true);
    try {
      await actions.deleteLinkedItem(detail.board_id, detail.item_id);
    } catch (error) {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
      setSaveError(getApiErrorMessage(error, "The item could not be deleted."));
    }
  };

  return (
    <div className="linked-item-overlay" onClick={onClose}>
      <div className="linked-item" role="dialog" aria-modal="true" aria-label={detail?.name ?? "Connected item"} onClick={(event) => event.stopPropagation()}>
        <div className="linked-item__corner">
          {detail && (
            <button
              ref={menu_button_ref}
              type="button"
              className="linked-item__icon-button"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={is_menu_open}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <circle cx="3.5" cy="8" r="1.3" fill="currentColor" />
                <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                <circle cx="12.5" cy="8" r="1.3" fill="currentColor" />
              </svg>
            </button>
          )}
          <button type="button" className="linked-item__icon-button" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
              <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ActionMenu
          anchor_el={menu_button_ref.current}
          is_open={is_menu_open && detail !== null}
          onClose={() => setIsMenuOpen(false)}
          aria_label="Item actions"
          align="end"
          width={240}
          sections={[
            {
              key: "item",
              items: [
                {
                  key: "conversation",
                  label: "Start conversation",
                  icon: <ConversationIcon />,
                  onClick: () => {
                    setIsMenuOpen(false);
                    onClose();
                    // A full load: the other board's deep link only opens the item's drawer (its updates) on a fresh mount.
                    if (detail) window.location.assign(detail.href);
                  },
                },
                {
                  key: "delete",
                  label: "Delete item",
                  icon: <TrashIcon />,
                  onClick: () => {
                    setIsMenuOpen(false);
                    setIsConfirmingDelete(true);
                  },
                },
              ],
            },
          ]}
        />

        <div className="linked-item__body shell-scrollbar">
          {load_error ? (
            <div className="linked-item__state">{load_error}</div>
          ) : !detail ? (
            <>
              <h2 className="linked-item__title">Loading...</h2>
              <div className="linked-item__location">in {item_ref.board_name} Board</div>
              <div className="linked-item__fields" aria-busy="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <FieldSkeleton key={index} />
                ))}
              </div>
            </>
          ) : (
            <>
              <ItemTitle name={detail.name} />
              <div className="linked-item__location">
                in &rarr;{" "}
                <Link href={detail.board_href} onClick={onClose}>
                  {detail.board_name}
                </Link>{" "}
                Board
              </div>
              {save_error && (
                <div role="alert" className="linked-item__notice">
                  {save_error}
                </div>
              )}
              <div className="linked-item__fields">
                <FieldLabel label="Group" swatch={GROUP_SWATCH} description={null} />
                <div className="linked-item__value">
                  <span className="linked-item__dot" style={{ background: detail.group.color }} />
                  <span className="linked-item__value-text" style={{ padding: 0 }}>
                    {detail.group.name}
                  </span>
                </div>
                {detail.fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    people={people}
                    is_picker_open={open_field_id === field.id}
                    onOpenPicker={() => setOpenFieldId(field.id)}
                    onClosePicker={() => setOpenFieldId(null)}
                    onSave={(value) => saveField(field, value)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {is_confirming_delete && detail && (
          <div className="linked-item__confirm">
            <div className="linked-item__confirm-card" role="alertdialog" aria-label="Delete item">
              <h3 className="linked-item__confirm-title">Delete this item?</h3>
              <p>
                &quot;{detail.name}&quot; will be deleted from {detail.board_name}. It goes to that board&apos;s trash, where it can be restored.
              </p>
              <div className="linked-item__confirm-actions">
                <button type="button" className="linked-item__button linked-item__button--tertiary" onClick={() => setIsConfirmingDelete(false)} disabled={is_deleting}>
                  Cancel
                </button>
                <button type="button" className="linked-item__button linked-item__button--danger" onClick={() => void deleteItem()} disabled={is_deleting}>
                  {is_deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemTitle({ name }: { name: string }) {
  const { anchor_props, tooltip } = useCellTooltip<HTMLHeadingElement>(name, { only_when_truncated: true });
  return (
    <>
      <h2 {...anchor_props} className="linked-item__title">
        {name || "Untitled item"}
      </h2>
      {tooltip}
    </>
  );
}

function FieldLabel({ label, swatch, description }: { label: string; swatch: { accent_color: string; glyph: string; glyph_text_color?: string } | undefined; description: string | null }) {
  const label_tooltip = useCellTooltip<HTMLSpanElement>(label, { only_when_truncated: true });
  const info_tooltip = useCellTooltip<HTMLSpanElement>(description);
  return (
    <div className="linked-item__label">
      <span className="linked-item__type-icon" style={{ background: swatch?.accent_color ?? "#c3c6d4", color: swatch?.glyph_text_color ?? "#ffffff" }} aria-hidden="true">
        {swatch?.glyph}
      </span>
      <span {...label_tooltip.anchor_props} className="linked-item__label-text">
        {label}
      </span>
      {description && (
        <span {...info_tooltip.anchor_props} tabIndex={0} className="linked-item__info" aria-label={description}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2 V11.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
          </svg>
        </span>
      )}
      {label_tooltip.tooltip}
      {info_tooltip.tooltip}
    </div>
  );
}

function FieldSkeleton() {
  return (
    <>
      <div className="linked-item__skeleton" style={{ height: 20 }} />
      <div className="linked-item__skeleton" />
    </>
  );
}

interface FieldRowProps {
  field: LinkedItemField;
  people: PersonDef[];
  is_picker_open: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSave: (value: CellValue) => void;
}

function FieldRow({ field, people, is_picker_open, onOpenPicker, onClosePicker, onSave }: FieldRowProps) {
  return (
    <>
      <FieldLabel label={field.label} swatch={COLUMN_KIND_SWATCH[field.type]} description={field.description} />
      <FieldValue field={field} people={people} is_picker_open={is_picker_open} onOpenPicker={onOpenPicker} onClosePicker={onClosePicker} onSave={onSave} />
    </>
  );
}

function asText(value: CellValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function FieldValue({ field, people, is_picker_open, onOpenPicker, onClosePicker, onSave }: FieldRowProps) {
  const { type, value } = field;

  if (LABEL_KINDS.has(type)) {
    const def = findDef(field.options, asText(value));
    const background = def?.color || EMPTY_PILL_COLOR;
    return (
      <div className="linked-item__value">
        <button type="button" className="linked-item__pill" style={{ background, color: contrastFg(background) }} onClick={onOpenPicker} aria-label={`${field.label}: ${def?.label || "empty"}`}>
          {def?.label ?? ""}
        </button>
        {is_picker_open && (
          <StatusMenu
            status_defs={field.options.filter((option) => option.is_active !== false)}
            selected_id={def?.id ?? null}
            onPick={(id) => {
              onClosePicker();
              onSave(id);
            }}
            onClear={() => {
              onClosePicker();
              onSave(null);
            }}
            onClose={onClosePicker}
          />
        )}
      </div>
    );
  }

  if (TEXT_KINDS.has(type) || type === "number") {
    return (
      <div className="linked-item__value">
        <EditableText
          key={`${field.id}:${asText(value)}`}
          initial={asText(value)}
          is_numeric={type === "number"}
          label={field.label}
          onCommit={(text) => onSave(text === "" ? null : type === "number" ? text.replace(/[^0-9.-]/g, "") : text)}
        />
      </div>
    );
  }

  if (type === "checkbox") {
    const is_checked = value === true || value === "true";
    return (
      <div className="linked-item__value">
        <button type="button" role="checkbox" aria-checked={is_checked} aria-label={field.label} className="linked-item__checkbox" onClick={() => onSave(!is_checked)}>
          {is_checked && (
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M2.2 6.3 L4.8 8.8 L9.8 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return <div className={`linked-item__value ${READ_ONLY_LEFT.has(type) ? "linked-item__value--left" : ""}`}>{readOnlyValue(field, people)}</div>;
}

/** Read only kinds whose content reads better from the left. */
const READ_ONLY_LEFT = new Set(["files", "tags", "dropdown"]);

function readOnlyValue(field: LinkedItemField, people: PersonDef[]): ReactNode {
  const { type, value } = field;
  const ids = Array.isArray(value) ? value.flatMap((entry) => (typeof entry === "string" || typeof entry === "number" ? [String(entry)] : [])) : [];

  switch (type) {
    case "people": {
      if (ids.length === 0) return <EmptyPerson />;
      return (
        <span style={{ display: "flex" }}>
          {ids.slice(0, MAX_AVATARS).map((id) => {
            const person = people.find((candidate) => candidate.id === id);
            return <AvatarBadge key={id} size={28} overlap initials={person?.initials ?? "?"} color={person?.color ?? "#c3c6d4"} name={person?.name} avatar_url={person?.avatar_url} has_ring />;
          })}
          {ids.length > MAX_AVATARS && <span className="linked-item__count" style={{ marginLeft: 4, alignSelf: "center" }}>+{ids.length - MAX_AVATARS}</span>}
        </span>
      );
    }
    case "date": {
      const date = asText(value);
      return <span className="linked-item__date" style={date ? { background: "#579bfc" } : undefined}>{date ? fmtDate(date) : "-"}</span>;
    }
    case "timeline": {
      const { start_iso, end_iso } = parseRangeValue(value);
      return <span className="linked-item__date" style={start_iso ? { background: "#579bfc" } : undefined}>{start_iso ? fmtRange(start_iso, end_iso || start_iso) : "-"}</span>;
    }
    case "connect_board": {
      const linked = field.linked_items ?? [];
      if (linked.length === 0) return null;
      return (
        <>
          <span className="linked-item__chip" style={{ "--linked-item-chip-color": linked[0].color ?? undefined } as CSSProperties}>
            <span>{linked[0].name}</span>
          </span>
          {linked.length > 1 && <span className="linked-item__count">+{linked.length - 1}</span>}
        </>
      );
    }
    case "dropdown": {
      const labels = ids.map((id) => field.options.find((option) => option.id === id)?.label).filter(Boolean);
      return <span className="linked-item__value-text" style={{ padding: 0 }}>{labels.join(", ")}</span>;
    }
    case "link": {
      const link = value && typeof value === "object" && !Array.isArray(value) && "url" in value ? (value as { url: string; text?: string }) : null;
      return link?.url ? (
        <a className="linked-item__link" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.text || link.url}
        </a>
      ) : null;
    }
    case "files": {
      const files = Array.isArray(value) ? (value as unknown[]).filter((entry): entry is { file_name: string; url: string } => typeof entry === "object" && entry !== null && "url" in entry) : [];
      return files.length > 0 ? (
        <a className="linked-item__link" href={files[0].url} target="_blank" rel="noopener noreferrer">
          {files[0].file_name}
          {files.length > 1 ? ` +${files.length - 1}` : ""}
        </a>
      ) : null;
    }
    case "rating":
      return <RatingDisplay value={value} rating_max={field.rating_max} icon={field.rating_icon} />;
    case "progress": {
      const percent = Math.max(0, Math.min(100, Number(value) || 0));
      return <span className="linked-item__value-text">{percent}%</span>;
    }
    case "vote":
      return <span className="linked-item__value-text">{ids.length} {ids.length === 1 ? "vote" : "votes"}</span>;
    case "time_tracking": {
      const seconds = value && typeof value === "object" && "seconds" in value ? Math.floor(Number((value as { seconds: number }).seconds) || 0) : 0;
      const pad = (part: number) => String(part).padStart(2, "0");
      return <span className="linked-item__value-text">{pad(Math.floor(seconds / 3600))}:{pad(Math.floor((seconds % 3600) / 60))}:{pad(seconds % 60)}</span>;
    }
    case "checklist": {
      const tasks = Array.isArray(value) ? (value as unknown[]).filter((entry): entry is { is_done: boolean } => typeof entry === "object" && entry !== null && "is_done" in entry) : [];
      return tasks.length > 0 ? <span className="linked-item__value-text">{tasks.filter((task) => task.is_done).length}/{tasks.length} done</span> : null;
    }
    case "tags":
      return ids.length > 0 ? <span className="linked-item__value-text" style={{ padding: 0 }}>{ids.length} {ids.length === 1 ? "tag" : "tags"}</span> : null;
    default: {
      const text = asText(value);
      return text ? <span className="linked-item__value-text">{text}</span> : null;
    }
  }
}

function EditableText({ initial, is_numeric, label, onCommit }: { initial: string; is_numeric: boolean; label: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      value={draft}
      inputMode={is_numeric ? "decimal" : undefined}
      aria-label={label}
      onChange={(event) => setDraft(is_numeric ? event.target.value.replace(/[^0-9.-]/g, "") : event.target.value)}
      onBlur={() => {
        if (draft.trim() !== initial.trim()) onCommit(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="linked-item__input"
    />
  );
}

function EmptyPerson() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-label="No one assigned">
      <circle cx="14" cy="14" r="13" fill="#ffffff" stroke="#c3c6d4" />
      <circle cx="14" cy="11" r="4" stroke="#c3c6d4" strokeWidth="1.4" />
      <path d="M6.5 22 a7.5 6 0 0 1 15 0" stroke="#c3c6d4" strokeWidth="1.4" />
    </svg>
  );
}

function ConversationIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M8 2.5 a5.5 5.5 0 1 1 -4.4 8.8 L2.5 13.5 L3.2 10.6 A5.5 5.5 0 0 1 8 2.5 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 5.8 V10.2 M5.8 8 H10.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M3 4.5 H13 M6.5 4.5 V3 H9.5 V4.5 M4.5 4.5 L5.2 13 H10.8 L11.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
