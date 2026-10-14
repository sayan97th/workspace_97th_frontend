"use client";

import { getApiErrorMessage } from "@/lib/api-error";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { DependencyLinkInput, DependencyLinkType } from "../types";
import type { DependencyPickerSection } from "../treeUtils";
import { useCellTooltip } from "../cells/CellTooltip";
import DependencyLinkRow, { type DependencyMenuLink } from "./DependencyLinkRow";
import PopoverPanel from "./PopoverPanel";
import "./dependency-picker.css";

const MAX_ITEM_NAME_LENGTH = 255;
/** The keyboard reachable "Create" row's key, see `NavRow`. */
const CREATE_ROW_KEY = "create";

/** A row the arrow keys walk through: an item card, or the "Create" row for the typed name. */
type NavRow = { key: string; kind: "item"; item_id: string } | { key: string; kind: "create" };

interface DependencyPickerProps {
  /** Every item this row may depend on, plus the ones it already does, by group. See `dependencyPickerSections`. */
  sections: DependencyPickerSection[];
  /** The items this row depends on, in the cell's order, each with its type and lag. */
  links: DependencyMenuLink[];
  /** Whether the scheduled column is a Timeline, the only kind where a link's type matters. */
  is_timeline: boolean;
  /** Why dates will not move by themselves (no date column picked, or "No action" mode). Null while scheduling works. */
  schedule_notice: string | null;
  /** Whether the viewer may change this cell. Off, the list is read only. */
  can_edit: boolean;
  /** Whether typing a name that matches nothing offers to create it as a new item. */
  can_create: boolean;
  /** Whether "Give feedback" is offered. */
  can_give_feedback: boolean;
  /** Whether "Open item page" is offered on each card. */
  can_open_items: boolean;
  /** The whole new list of links. Only a link the user just changed carries its `type`/`lag_days`, the others keep what the server has. */
  onChange: (links: DependencyLinkInput[]) => void;
  /** Creates `name` as a new item and links it. Rejects with a message to show. */
  onCreateItem: (name: string) => Promise<void>;
  onOpenItem: (item_id: string) => void;
  onGiveFeedback: () => void;
  onClose: () => void;
  /** The open cell's own card (its chips with remove buttons), laid over the cell, see `PopoverPanel`. */
  anchor_overlay?: ReactNode;
}

/**
 * The Dependency cell's "Choose dependencies" picker, monday.com style: a search that also
 * creates items ("Type to find or create item"), then every item this one may depend on as a
 * card under its group (group name and card bar in the group color). A selected card turns blue
 * with a check, a hovered one offers "Open item page". Items that already depend on this one,
 * directly or through others, are left out so no loop can be made. "Days between items" switches
 * to the linked items with how many days before or after each one this item is scheduled.
 */
export default function DependencyPicker({
  sections,
  links,
  is_timeline,
  schedule_notice,
  can_edit,
  can_create,
  can_give_feedback,
  can_open_items,
  onChange,
  onCreateItem,
  onOpenItem,
  onGiveFeedback,
  onClose,
  anchor_overlay,
}: DependencyPickerProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"items" | "schedule">("items");
  const [active_key, setActiveKey] = useState<string | null>(null);
  const [is_creating, setIsCreating] = useState(false);
  const [create_error, setCreateError] = useState<string | null>(null);
  const list_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);

  const normalized_query = query.trim().toLowerCase();
  const linked_ids = useMemo(() => links.map((link) => link.id), [links]);
  const linked_set = useMemo(() => new Set(linked_ids), [linked_ids]);

  const visible_sections = useMemo(
    () =>
      sections
        .map((section) => ({ ...section, items: section.items.filter((item) => !normalized_query || (item.name || "").toLowerCase().includes(normalized_query)) }))
        .filter((section) => section.items.length > 0),
    [sections, normalized_query]
  );

  // Offered while the typed name is not already an item of the list.
  const has_exact_match = sections.some((section) => section.items.some((item) => item.name.trim().toLowerCase() === normalized_query));
  const show_create_row = can_edit && can_create && normalized_query.length > 0 && !has_exact_match;

  const nav_rows: NavRow[] = visible_sections.flatMap((section) => section.items.map((item): NavRow => ({ key: `item:${item.id}`, kind: "item", item_id: item.id })));
  if (show_create_row) nav_rows.push({ key: CREATE_ROW_KEY, kind: "create" });
  // A filtered out row can't stay active.
  const active_row = nav_rows.find((row) => row.key === active_key) ?? null;

  useEffect(() => {
    if (!active_key) return;
    list_ref.current?.querySelector(`[data-nav-key="${CSS.escape(active_key)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active_key]);

  const ids = linked_ids.map((id) => ({ predecessor_id: id }));
  const toggleItem = (item_id: string) => {
    if (!can_edit) return;
    onChange(linked_set.has(item_id) ? ids.filter((entry) => entry.predecessor_id !== item_id) : [...ids, { predecessor_id: item_id }]);
  };
  const patchLink = (id: string, patch: { type?: DependencyLinkType; lag_days?: number }) =>
    onChange(ids.map((entry) => (entry.predecessor_id === id ? { ...entry, ...patch } : entry)));

  const createItem = async () => {
    const name = query.trim().slice(0, MAX_ITEM_NAME_LENGTH);
    if (!name || is_creating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateItem(name);
      setQuery("");
      setActiveKey(null);
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "The item could not be created."));
    } finally {
      setIsCreating(false);
    }
  };

  const activateRow = (row: NavRow) => {
    if (row.kind === "item") toggleItem(row.item_id);
    else void createItem();
  };

  const moveActive = (step: 1 | -1) => {
    if (nav_rows.length === 0) return;
    const index = active_row ? nav_rows.indexOf(active_row) : -1;
    const next = index === -1 ? (step === 1 ? 0 : nav_rows.length - 1) : (index + step + nav_rows.length) % nav_rows.length;
    setActiveKey(nav_rows[next].key);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (view === "schedule") setView("items");
      else onClose();
      return;
    }
    if (view !== "items") return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && event.target === search_ref.current) {
      event.preventDefault();
      if (active_row) activateRow(active_row);
      else if (nav_rows.length === 1) activateRow(nav_rows[0]);
      else if (show_create_row && visible_sections.length === 0) void createItem();
    }
  };

  const can_schedule = links.length > 0;

  return (
    <PopoverPanel onClose={onClose} unstyled anchor_overlay={anchor_overlay} className="left-1/2 top-[calc(100%+8px)] -translate-x-1/2">
      <div className="dependency-picker" role="dialog" aria-label="Choose dependencies" onKeyDown={handleKeyDown}>
        {view === "schedule" ? (
          <>
            <div className="dependency-picker__header">
              <button type="button" className="dependency-picker__back" onClick={() => setView("items")} aria-label="Back to items">
                <BackIcon />
              </button>
              <h3 className="dependency-picker__title">Days between items</h3>
            </div>
            <p className="dependency-picker__hint">How many days before or after each item this one is scheduled.</p>
            {schedule_notice && <div className="dependency-picker__notice">{schedule_notice}</div>}
            <div className="dependency-picker__schedule shell-scrollbar">
              {links.map((link) => (
                <DependencyLinkRow
                  key={link.id}
                  link={link}
                  is_timeline={is_timeline}
                  is_read_only={!can_edit}
                  onPatch={(patch) => patchLink(link.id, patch)}
                  onRemove={() => toggleItem(link.id)}
                />
              ))}
              {links.length === 0 && <div className="dependency-picker__empty">This item does not depend on any item yet.</div>}
            </div>
          </>
        ) : (
          <>
            <div className="dependency-picker__header">
              <h3 className="dependency-picker__title">Choose dependencies</h3>
              <span className="dependency-picker__badge">Beta</span>
              {can_give_feedback && (
                <button type="button" className="dependency-picker__feedback" onClick={onGiveFeedback}>
                  <FeedbackIcon />
                  Give feedback
                </button>
              )}
            </div>

            <label className="dependency-picker__search">
              <SearchIcon />
              <input
                ref={search_ref}
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveKey(null);
                  setCreateError(null);
                }}
                maxLength={MAX_ITEM_NAME_LENGTH}
                placeholder={can_edit && can_create ? "Type to find or create item" : "Type to find item"}
                className="dependency-picker__search-input"
                aria-label="Find items"
                aria-controls="dependency-picker-list"
                aria-activedescendant={active_key ? `dependency-picker-row-${active_key}` : undefined}
              />
            </label>

            <div ref={list_ref} id="dependency-picker-list" className="dependency-picker__list shell-scrollbar" role="listbox" aria-label="Items" aria-multiselectable="true">
              {create_error && (
                <div className="dependency-picker__error" role="alert">
                  {create_error}
                </div>
              )}
              {visible_sections.map((section) => (
                <section key={section.key} className="dependency-picker__section" style={{ "--dependency-picker-group-color": section.color } as CSSProperties}>
                  <div className="dependency-picker__group-title" title={section.title}>
                    {section.title}
                  </div>
                  {section.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      nav_key={`item:${item.id}`}
                      name={item.name}
                      is_selected={linked_set.has(item.id)}
                      is_active={active_key === `item:${item.id}`}
                      can_edit={can_edit}
                      can_open={can_open_items}
                      onToggle={() => toggleItem(item.id)}
                      onOpen={() => onOpenItem(item.id)}
                    />
                  ))}
                </section>
              ))}

              {show_create_row && (
                <button
                  type="button"
                  id={`dependency-picker-row-${CREATE_ROW_KEY}`}
                  data-nav-key={CREATE_ROW_KEY}
                  data-active={active_key === CREATE_ROW_KEY || undefined}
                  className="dependency-picker__create"
                  disabled={is_creating}
                  onClick={() => void createItem()}
                >
                  <PlusIcon />
                  <span className="dependency-picker__create-label">{is_creating ? "Creating..." : <>Create &ldquo;{query.trim()}&rdquo;</>}</span>
                </button>
              )}

              {visible_sections.length === 0 && !show_create_row && (
                <div className="dependency-picker__empty">
                  {normalized_query ? "No items match your search." : "There are no other items this one can depend on yet."}
                </div>
              )}
            </div>

            {can_schedule && (
              <div className="dependency-picker__footer">
                <button type="button" className="dependency-picker__footer-button" onClick={() => setView("schedule")}>
                  <CalendarIcon />
                  Days between items
                  <span className="dependency-picker__footer-count">{links.length}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PopoverPanel>
  );
}

interface ItemCardProps {
  nav_key: string;
  name: string;
  is_selected: boolean;
  is_active: boolean;
  can_edit: boolean;
  can_open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

/** One item: a bordered card with its group color bar, blue with a check once selected, "Open item page" on hover. */
function ItemCard({ nav_key, name, is_selected, is_active, can_edit, can_open, onToggle, onOpen }: ItemCardProps) {
  const label = name || "Untitled item";
  const name_tooltip = useCellTooltip<HTMLSpanElement>(label, { only_when_truncated: true });
  const open_tooltip = useCellTooltip<HTMLButtonElement>("Open item page");

  return (
    <div
      id={`dependency-picker-row-${nav_key}`}
      data-nav-key={nav_key}
      role="option"
      aria-selected={is_selected}
      aria-disabled={!can_edit || undefined}
      data-active={is_active || undefined}
      data-readonly={!can_edit || undefined}
      className="dependency-picker__card"
      onClick={() => {
        name_tooltip.hide();
        onToggle();
      }}
    >
      <span {...name_tooltip.anchor_props} className="dependency-picker__card-name">
        {label}
      </span>
      {can_open && (
        <button
          type="button"
          {...open_tooltip.anchor_props}
          className="dependency-picker__open"
          aria-label={`Open ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            open_tooltip.hide();
            onOpen();
          }}
        >
          <ExpandIcon />
        </button>
      )}
      {is_selected && (
        <span className="dependency-picker__check" aria-hidden="true">
          <CheckIcon />
        </span>
      )}
      {name_tooltip.tooltip}
      {open_tooltip.tooltip}
    </div>
  );
}

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true" style={{ flex: "none" }}>
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 L13.6 13.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Icon>
  );
}

function FeedbackIcon() {
  return (
    <Icon size={18}>
      <path d="M8 2.2 a5.8 5.8 0 0 1 0 11.6 H2.6 l1.3 -1.9 A5.8 5.8 0 0 1 8 2.2 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.4 9.2 Q8 11 10.6 9.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="6" cy="6.8" r="0.7" fill="currentColor" />
      <circle cx="10" cy="6.8" r="0.7" fill="currentColor" />
    </Icon>
  );
}

function ExpandIcon() {
  return (
    <Icon>
      <path d="M9.5 2.5 H13.5 V6.5 M13.5 2.5 L9 7 M6.5 13.5 H2.5 V9.5 M2.5 13.5 L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon size={14}>
      <path d="M3.2 8.4 L6.4 11.4 L12.8 4.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon size={14}>
      <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  );
}

function BackIcon() {
  return (
    <Icon>
      <path d="M10 3.5 L5.5 8 L10 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function CalendarIcon() {
  return (
    <Icon>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5 H13.5 M5.5 2 V4.5 M10.5 2 V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Icon>
  );
}
