"use client";

import { getApiErrorMessage } from "@/lib/api-error";
import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { COLUMN_KIND_SWATCH } from "../../columnTypes";
import type { ConnectBoardOption, ConnectColumnOptions, ConnectItemOption } from "../types";
import { useCellTooltip } from "../cells/CellTooltip";
import { useOutsideClick } from "../useOutsideClick";
import PopoverPanel from "./PopoverPanel";
import "./connect-items-picker.css";

/** The item name, always searchable, listed first in "Choose columns to search". */
const NAME_COLUMN_ID = "name";
const NAME_COLUMN_SWATCH = { accent_color: "#a25ddc", glyph: "T" };
/** Per viewer memory of the columns a Connect boards column's picker searches. */
const SEARCH_COLUMNS_STORAGE_PREFIX = "connect_search_columns:";
const SKELETON_ROWS = 4;
const MAX_ADD_NAME_LENGTH = 255;

type SortMode = "board" | "name_asc" | "name_desc" | "newest" | "oldest";

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "board", label: "Board order" },
  { mode: "name_asc", label: "Name, A to Z" },
  { mode: "name_desc", label: "Name, Z to A" },
  { mode: "newest", label: "Newest first" },
  { mode: "oldest", label: "Oldest first" },
];

/** A keyboard reachable row of the list: an item, or a group's "+ Add item". */
type NavRow = { key: string; kind: "item"; item: ConnectItemOption } | { key: string; kind: "add"; board_id: string; group_id: string };

interface ConnectItemsPickerProps {
  column_id: string;
  /** Undefined while the connected boards load. */
  options: ConnectColumnOptions | undefined;
  selected_ids: string[];
  /** Whether the viewer may change this cell. Off, the list is read only. */
  can_edit: boolean;
  /** Whether "Boards settings" is offered (board structure permission). */
  can_edit_settings: boolean;
  onToggle: (item_id: string) => void;
  /** Creates `name` in the group and links it to the cell. Rejects with a message to show. */
  onCreateItem: (board_id: string, group_id: string, name: string) => Promise<void>;
  onOpenSettings: () => void;
  /** Opens a connected item's card. */
  onOpenItem: (item: ConnectItemOption) => void;
  onClose: () => void;
}

function readSearchColumns(column_id: string): string[] {
  try {
    const raw = window.localStorage.getItem(SEARCH_COLUMNS_STORAGE_PREFIX + column_id);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string") && parsed.length > 0) return parsed;
  } catch {
    // Storage blocked or corrupt, fall back to the item name.
  }
  return [NAME_COLUMN_ID];
}

function writeSearchColumns(column_id: string, ids: string[]) {
  try {
    window.localStorage.setItem(SEARCH_COLUMNS_STORAGE_PREFIX + column_id, JSON.stringify(ids));
  } catch {
    // Not remembered, still applied for this session.
  }
}

function sortItems(items: ConnectItemOption[], mode: SortMode): ConnectItemOption[] {
  if (mode === "board") return items;
  const created = (item: ConnectItemOption) => (item.created_at ? Date.parse(item.created_at) : 0);
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (mode === "name_asc") return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    if (mode === "name_desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base", numeric: true });
    if (mode === "newest") return created(b) - created(a);
    return created(a) - created(b);
  });
  return sorted;
}

/**
 * The Connect boards cell's "Choose items" picker, monday.com style: the connected board's
 * items listed by group (each in its group color), with a search that can also look at other
 * columns ("Choose columns to search"), a sort menu, "Boards settings", "+ Add item" at the end
 * of every group, and a hover button that opens the item. Arrow keys move through the list,
 * Enter links the active item (or adds the typed name when nothing matches), Escape closes.
 */
export default function ConnectItemsPicker({ column_id, options, selected_ids, can_edit, can_edit_settings, onToggle, onCreateItem, onOpenSettings, onOpenItem, onClose }: ConnectItemsPickerProps) {
  const [query, setQuery] = useState("");
  const [sort_mode, setSortMode] = useState<SortMode>("board");
  const [search_column_ids, setSearchColumnIds] = useState<string[]>(() => readSearchColumns(column_id));
  const [open_flyout, setOpenFlyout] = useState<"sort" | "columns" | null>(null);
  const [active_key, setActiveKey] = useState<string | null>(null);
  const [adding_key, setAddingKey] = useState<string | null>(null);
  const [add_draft, setAddDraft] = useState("");
  const [is_creating, setIsCreating] = useState(false);
  const [create_error, setCreateError] = useState<string | null>(null);
  const list_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);

  const boards = useMemo(() => options?.boards ?? [], [options]);
  const normalized_query = query.trim().toLowerCase();
  const selected_set = useMemo(() => new Set(selected_ids), [selected_ids]);

  const item_index = useMemo(() => {
    const index = new Map<string, ConnectItemOption>();
    for (const board of boards) for (const item of board.items) index.set(item.id, item);
    return index;
  }, [boards]);

  const matches = useMemo(() => {
    const searched = new Set(search_column_ids);
    return (item: ConnectItemOption) => {
      if (!normalized_query) return true;
      if (searched.has(NAME_COLUMN_ID) && item.name.toLowerCase().includes(normalized_query)) return true;
      return Object.entries(item.texts).some(([id, text]) => searched.has(id) && text.toLowerCase().includes(normalized_query));
    };
  }, [normalized_query, search_column_ids]);

  const linked_items = useMemo(
    () => sortItems(selected_ids.map((id) => item_index.get(id)).filter((item): item is ConnectItemOption => Boolean(item) && matches(item!)), sort_mode),
    [selected_ids, item_index, matches, sort_mode]
  );

  // "Connected items": the cell's items under their own group (board order), like monday. Items from
  // another tab of the board have no listed group and close the board's part as "Other items".
  const linked_sections = useMemo(() => {
    const sections: { key: string; board_name: string; title: string; color: string | null; items: ConnectItemOption[] }[] = [];
    for (const board of boards) {
      const board_items = linked_items.filter((item) => item.board_id === board.id);
      for (const group of board.groups) {
        const items = board_items.filter((item) => item.group_id === group.id);
        if (items.length > 0) sections.push({ key: `${board.id}:${group.id}`, board_name: board.name, title: group.name, color: group.color, items });
      }
      const ungrouped = board_items.filter((item) => item.group_id === null || !board.groups.some((group) => group.id === item.group_id));
      if (ungrouped.length > 0) sections.push({ key: `${board.id}:other`, board_name: board.name, title: "Other items", color: null, items: ungrouped });
    }
    return sections;
  }, [boards, linked_items]);

  // Each board's groups with their matching items, sorted. While searching, groups without a match are left out.
  const board_sections = useMemo(
    () =>
      boards.map((board) => ({
        board,
        groups: board.groups
          .map((group) => ({ group, items: sortItems(board.items.filter((item) => item.group_id === group.id && matches(item)), sort_mode) }))
          .filter((section) => !normalized_query || section.items.length > 0),
      })),
    [boards, matches, sort_mode, normalized_query]
  );

  const has_any_match = board_sections.some((section) => section.groups.some((group) => group.items.length > 0));
  const canAdd = (board: ConnectBoardOption) => can_edit && board.can_add_items;
  // Nothing matches the search: each board that allows it offers to add the typed name to its first group.
  const fallback_add_targets = !has_any_match && normalized_query ? boards.filter((board) => canAdd(board) && board.groups.length > 0) : [];

  // Every row the arrow keys walk through, in the order they are drawn.
  const nav_rows: NavRow[] = linked_sections.flatMap((section) => section.items.map((item): NavRow => ({ key: `linked:${item.id}`, kind: "item", item })));
  for (const { board, groups } of board_sections) {
    for (const { group, items } of groups) {
      for (const item of items) nav_rows.push({ key: `item:${item.id}`, kind: "item", item });
      if (canAdd(board)) nav_rows.push({ key: `add:${board.id}:${group.id}`, kind: "add", board_id: board.id, group_id: group.id });
    }
  }
  for (const board of fallback_add_targets) nav_rows.push({ key: `add:${board.id}:${board.groups[0].id}`, kind: "add", board_id: board.id, group_id: board.groups[0].id });

  // A filtered out row can't stay active.
  const active_row = nav_rows.find((row) => row.key === active_key) ?? null;

  useEffect(() => {
    if (!active_key) return;
    list_ref.current?.querySelector(`[data-nav-key="${CSS.escape(active_key)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active_key]);

  const updateSearchColumns = (ids: string[]) => {
    const next = ids.length > 0 ? ids : [NAME_COLUMN_ID];
    setSearchColumnIds(next);
    writeSearchColumns(column_id, next);
  };

  const createItem = async (board_id: string, group_id: string, raw_name: string) => {
    const name = raw_name.trim().slice(0, MAX_ADD_NAME_LENGTH);
    if (!name || is_creating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateItem(board_id, group_id, name);
      setQuery("");
      setAddingKey(null);
      setAddDraft("");
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "The item could not be added."));
    } finally {
      setIsCreating(false);
    }
  };

  const activateAddRow = (row: Extract<NavRow, { kind: "add" }>) => {
    if (normalized_query) {
      void createItem(row.board_id, row.group_id, query);
      return;
    }
    setAddingKey(row.key);
    setAddDraft("");
  };

  const activateRow = (row: NavRow) => {
    if (row.kind === "item") {
      if (can_edit) onToggle(row.item.id);
    } else {
      activateAddRow(row);
    }
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
      if (open_flyout) setOpenFlyout(null);
      else if (adding_key) setAddingKey(null);
      else onClose();
      return;
    }
    // The inline "+ Add item" field and the flyouts handle their own keys.
    if (adding_key || open_flyout) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && event.target === search_ref.current) {
      event.preventDefault();
      if (active_row) activateRow(active_row);
      else if (fallback_add_targets.length > 0) void createItem(fallback_add_targets[0].id, fallback_add_targets[0].groups[0].id, query);
    }
  };

  const heading = boards.length === 1 ? boards[0].name : boards.length > 1 ? boards.map((board) => board.name).join(", ") : null;
  const hidden_board_count = options?.hidden_board_count ?? 0;

  const renderAddRow = (board: ConnectBoardOption, group_id: string, color: string | undefined) => {
    const key = `add:${board.id}:${group_id}`;
    return (
      <AddItemRow
        key={key}
        nav_key={key}
        color={color}
        query={query.trim()}
        is_active={active_key === key}
        is_editing={adding_key === key}
        is_creating={is_creating}
        draft={add_draft}
        onDraftChange={setAddDraft}
        onActivate={() => activateAddRow({ key, kind: "add", board_id: board.id, group_id })}
        onSubmit={() => void createItem(board.id, group_id, add_draft)}
        onCancel={() => setAddingKey(null)}
      />
    );
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full mt-1 -translate-x-1/2">
      <div className="connect-picker" role="dialog" aria-label="Choose items" onKeyDown={handleKeyDown}>
        <div className="connect-picker__header">
          <h3 className="connect-picker__title">Choose items</h3>
          <TooltipButton
            label="Sort items"
            className="connect-picker__icon-button"
            aria-haspopup="menu"
            aria-expanded={open_flyout === "sort"}
            data-active={sort_mode !== "board" || undefined}
            onClick={() => setOpenFlyout((current) => (current === "sort" ? null : "sort"))}
          >
            <SortIcon />
          </TooltipButton>
          {can_edit_settings && (
            <button type="button" className="connect-picker__settings" onClick={onOpenSettings}>
              <GearIcon />
              Boards settings
            </button>
          )}
        </div>
        {open_flyout === "sort" && (
          <SortMenu
            mode={sort_mode}
            onPick={(mode) => {
              setSortMode(mode);
              setOpenFlyout(null);
            }}
            onClose={() => setOpenFlyout(null)}
          />
        )}

        {heading && (
          <div className="connect-picker__board-name" title={boards.length > 1 ? heading : undefined}>
            {heading}
          </div>
        )}

        {(boards.length > 0 || !options) && (
          <div className="connect-picker__search-row">
            <label className="connect-picker__search">
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
                placeholder={can_edit && boards.some((board) => board.can_add_items) ? "Search or add item" : "Search items"}
                className="connect-picker__search-input"
                aria-label="Search items"
                aria-controls="connect-picker-list"
                aria-activedescendant={active_key ? `connect-picker-row-${active_key}` : undefined}
              />
            </label>
            <TooltipButton
              label="Choose columns to search"
              className="connect-picker__icon-button"
              aria-haspopup="dialog"
              aria-expanded={open_flyout === "columns"}
              data-active={open_flyout === "columns" || search_column_ids.some((id) => id !== NAME_COLUMN_ID) || undefined}
              onClick={() => setOpenFlyout((current) => (current === "columns" ? null : "columns"))}
            >
              <FilterIcon />
            </TooltipButton>
            {open_flyout === "columns" && (
              <SearchColumnsMenu boards={boards} selected_ids={search_column_ids} onChange={updateSearchColumns} onClose={() => setOpenFlyout(null)} />
            )}
          </div>
        )}

        <div ref={list_ref} id="connect-picker-list" className="connect-picker__list shell-scrollbar" role="listbox" aria-label="Items">
          {create_error && <div className="connect-picker__error" role="alert">{create_error}</div>}

          {!options ? (
            <div className="connect-picker__rows" aria-busy="true">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <div key={index} className="connect-picker__skeleton" />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div className="connect-picker__empty">
              {hidden_board_count > 0 ? "Only users with access to all connected boards can see this column's contents." : "This column is not connected to a board yet."}
              {can_edit_settings && (
                <div>
                  <button type="button" className="connect-picker__empty-action" onClick={onOpenSettings}>
                    Choose boards
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {linked_sections.length > 0 && (
                <>
                  <div className="connect-picker__section-title">Connected items</div>
                  {linked_sections.map((section, index) => (
                    <section key={section.key} style={section.color ? ({ "--connect-picker-group-color": section.color } as CSSProperties) : undefined}>
                      {boards.length > 1 && section.board_name !== linked_sections[index - 1]?.board_name && <div className="connect-picker__board-title">{section.board_name}</div>}
                      <div className="connect-picker__group-title">{section.title}</div>
                      <div className="connect-picker__rows">
                        {section.items.map((item) => (
                          <ItemRow
                            key={`linked:${item.id}`}
                            nav_key={`linked:${item.id}`}
                            item={item}
                            is_selected
                            is_active={active_key === `linked:${item.id}`}
                            can_edit={can_edit}
                            onToggle={() => onToggle(item.id)}
                            onOpen={() => onOpenItem(item)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}

              {has_any_match && <div className="connect-picker__section-title">All items</div>}

              {board_sections.map(({ board, groups }) => (
                <div key={board.id}>
                  {boards.length > 1 && groups.length > 0 && <div className="connect-picker__board-title">{board.name}</div>}
                  {groups.map(({ group, items }) => (
                    <section key={group.id} style={{ "--connect-picker-group-color": group.color } as CSSProperties}>
                      <div className="connect-picker__group-title">{group.name}</div>
                      <div className="connect-picker__rows">
                        {items.map((item) => (
                          <ItemRow
                            key={item.id}
                            nav_key={`item:${item.id}`}
                            item={item}
                            is_selected={selected_set.has(item.id)}
                            is_active={active_key === `item:${item.id}`}
                            can_edit={can_edit}
                            onToggle={() => onToggle(item.id)}
                            onOpen={() => onOpenItem(item)}
                          />
                        ))}
                        {canAdd(board) && renderAddRow(board, group.id, group.color)}
                      </div>
                    </section>
                  ))}
                  {!normalized_query && groups.length === 0 && <div className="connect-picker__empty">{board.name} has no groups yet.</div>}
                </div>
              ))}

              {!has_any_match && normalized_query && (
                <>
                  <div className="connect-picker__empty">No items match &quot;{query.trim()}&quot;</div>
                  {fallback_add_targets.map((board) => (
                    <section key={board.id} style={{ "--connect-picker-group-color": board.groups[0].color } as CSSProperties}>
                      {fallback_add_targets.length > 1 && <div className="connect-picker__board-title">{board.name}</div>}
                      <div className="connect-picker__rows">{renderAddRow(board, board.groups[0].id, board.groups[0].color)}</div>
                    </section>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PopoverPanel>
  );
}

interface ItemRowProps {
  nav_key: string;
  item: ConnectItemOption;
  is_selected: boolean;
  is_active: boolean;
  can_edit: boolean;
  onToggle: () => void;
  /** Opens the item's card. */
  onOpen: () => void;
}

/** One linkable item: group color bar, checkbox, name (full name in a tooltip when cut off) and a hover "Open item". */
function ItemRow({ nav_key, item, is_selected, is_active, can_edit, onToggle, onOpen }: ItemRowProps) {
  const name = item.name || "Untitled item";
  const name_tooltip = useCellTooltip<HTMLSpanElement>(name, { only_when_truncated: true });
  const open_tooltip = useCellTooltip<HTMLButtonElement>("Open item");
  const style = item.color ? ({ "--connect-picker-group-color": item.color } as CSSProperties) : undefined;

  return (
    <div
      id={`connect-picker-row-${nav_key}`}
      data-nav-key={nav_key}
      role="option"
      aria-selected={is_selected}
      aria-disabled={!can_edit || undefined}
      data-active={is_active || undefined}
      className="connect-picker__row"
      style={{ ...style, cursor: can_edit ? undefined : "default" }}
      onClick={() => {
        name_tooltip.hide();
        if (can_edit) onToggle();
      }}
    >
      <span className="connect-picker__checkbox-cell">
        <span className="connect-picker__checkbox" aria-hidden="true">
          {is_selected && <CheckIcon />}
        </span>
      </span>
      <span {...name_tooltip.anchor_props} className="connect-picker__row-name">
        {name}
      </span>
      <button
        type="button"
        {...open_tooltip.anchor_props}
        className="connect-picker__open"
        aria-label={`Open ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          open_tooltip.hide();
          onOpen();
        }}
      >
        <ExpandIcon />
      </button>
      {name_tooltip.tooltip}
      {open_tooltip.tooltip}
    </div>
  );
}

interface AddItemRowProps {
  nav_key: string;
  color: string | undefined;
  /** The search text, added as the item name when set. */
  query: string;
  is_active: boolean;
  is_editing: boolean;
  is_creating: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onActivate: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/** "+ Add item" at the end of a group: adds the searched text right away, or turns into a name field. */
function AddItemRow({ nav_key, color, query, is_active, is_editing, is_creating, draft, onDraftChange, onActivate, onSubmit, onCancel }: AddItemRowProps) {
  const style = color ? ({ "--connect-picker-group-color": color } as CSSProperties) : undefined;

  return (
    <div
      id={`connect-picker-row-${nav_key}`}
      data-nav-key={nav_key}
      role="option"
      aria-selected={false}
      data-active={is_active || undefined}
      className="connect-picker__row connect-picker__add-row"
      style={style}
      onClick={() => {
        if (!is_editing && !is_creating) onActivate();
      }}
    >
      <span className="connect-picker__checkbox-cell">
        <span className="connect-picker__checkbox" aria-hidden="true" />
      </span>
      {is_editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={MAX_ADD_NAME_LENGTH}
          disabled={is_creating}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          onBlur={() => {
            if (!draft.trim() && !is_creating) onCancel();
          }}
          placeholder="Item name"
          aria-label="New item name"
          className="connect-picker__add-input"
        />
      ) : (
        <span className="connect-picker__add-label">
          <span>{is_creating ? "Adding..." : query ? `+ Add "${query}"` : "+ Add item"}</span>
        </span>
      )}
    </div>
  );
}

function SortMenu({ mode, onPick, onClose }: { mode: SortMode; onPick: (mode: SortMode) => void; onClose: () => void }) {
  const menu_ref = useOutsideClick<HTMLDivElement>(true, onClose);

  return (
    <div ref={menu_ref} className="connect-picker__flyout connect-picker__sort-menu" role="menu" aria-label="Sort items">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="menuitemradio"
          aria-checked={mode === option.mode}
          className="connect-picker__sort-option"
          onClick={() => onPick(option.mode)}
        >
          {option.label}
          {mode === option.mode && <CheckIcon size={12} />}
        </button>
      ))}
    </div>
  );
}

interface SearchColumnsMenuProps {
  boards: ConnectBoardOption[];
  selected_ids: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

/** "Choose columns to search": the item name plus every searchable column of the connected boards. */
function SearchColumnsMenu({ boards, selected_ids, onChange, onClose }: SearchColumnsMenuProps) {
  const [column_query, setColumnQuery] = useState("");
  const menu_ref = useOutsideClick<HTMLDivElement>(true, onClose);
  const normalized = column_query.trim().toLowerCase();
  const selected = new Set(selected_ids);

  const all_ids = [NAME_COLUMN_ID, ...boards.flatMap((board) => board.columns.map((column) => column.id))];
  const selected_count = all_ids.filter((id) => selected.has(id)).length;
  const all_state = selected_count === all_ids.length ? "on" : selected_count > 0 ? "mixed" : "off";

  const toggle = (id: string) => onChange(selected.has(id) ? selected_ids.filter((current) => current !== id) : [...selected_ids, id]);
  const toggleAll = () => onChange(all_state === "on" ? [NAME_COLUMN_ID] : all_ids);
  const shows = (label: string) => !normalized || label.toLowerCase().includes(normalized);

  return (
    <div ref={menu_ref} className="connect-picker__flyout connect-picker__columns-menu" role="dialog" aria-label="Choose columns to search">
      <div className="connect-picker__columns-title">Choose columns to search</div>
      <label className="connect-picker__search connect-picker__columns-search">
        <SearchIcon />
        <input
          autoFocus
          value={column_query}
          onChange={(event) => setColumnQuery(event.target.value)}
          placeholder="Find a column"
          aria-label="Find a column"
          className="connect-picker__search-input"
        />
      </label>
      <div className="connect-picker__columns-list shell-scrollbar">
        {!normalized && (
          <button type="button" role="checkbox" aria-checked={all_state === "mixed" ? "mixed" : all_state === "on"} className="connect-picker__column-option connect-picker__column-option--all" onClick={toggleAll}>
            <CheckboxGlyph state={all_state} />
            <span className="connect-picker__column-label">
              All columns <span className="connect-picker__column-count">{selected_count} selected</span>
            </span>
          </button>
        )}
        {shows("Name") && <ColumnOption id={NAME_COLUMN_ID} label="Name" swatch={NAME_COLUMN_SWATCH} is_on={selected.has(NAME_COLUMN_ID)} onToggle={toggle} />}
        {boards.map((board) => {
          const columns = board.columns.filter((column) => shows(column.label));
          if (columns.length === 0) return null;
          return (
            <div key={board.id}>
              {boards.length > 1 && <div className="connect-picker__column-board">{board.name}</div>}
              {columns.map((column) => (
                <ColumnOption key={column.id} id={column.id} label={column.label} swatch={COLUMN_KIND_SWATCH[column.type]} is_on={selected.has(column.id)} onToggle={toggle} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ColumnOptionProps {
  id: string;
  label: string;
  swatch: { accent_color: string; glyph: string; glyph_text_color?: string } | undefined;
  is_on: boolean;
  onToggle: (id: string) => void;
}

function ColumnOption({ id, label, swatch, is_on, onToggle }: ColumnOptionProps) {
  return (
    <button type="button" role="checkbox" aria-checked={is_on} className="connect-picker__column-option" onClick={() => onToggle(id)}>
      <CheckboxGlyph state={is_on ? "on" : "off"} />
      <span className="connect-picker__column-icon" style={{ background: swatch?.accent_color ?? "#c3c6d4", color: swatch?.glyph_text_color ?? "#ffffff" }} aria-hidden="true">
        {swatch?.glyph}
      </span>
      <span className="connect-picker__column-label">{label}</span>
    </button>
  );
}

/** An icon button with the shared dark tooltip. */
function TooltipButton({ label, children, ...props }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement> & { "data-active"?: boolean }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(label);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        {...props}
        {...anchor_props}
        onClick={(event) => {
          hide();
          props.onClick?.(event);
        }}
      >
        {children}
      </button>
      {tooltip}
    </>
  );
}

function CheckboxGlyph({ state }: { state: "on" | "off" | "mixed" }) {
  return (
    <span className="connect-picker__box" data-state={state} aria-hidden="true">
      {state === "on" && <CheckIcon />}
      {state === "mixed" && (
        <svg viewBox="0 0 12 12" width="10" height="10">
          <path d="M2.5 6 H9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path d="M2.2 6.3 L4.8 8.8 L9.8 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 L13.6 13.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M2.5 4.5 H13.5 M2.5 8 H13.5 M2.5 11.5 H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10.5" cy="4.5" r="1.6" fill="var(--connect-picker-surface)" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="8" r="1.6" fill="var(--connect-picker-surface)" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="11.5" r="1.6" fill="var(--connect-picker-surface)" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M5 13 V3 M5 3 L2.6 5.4 M5 3 L7.4 5.4 M11 3 V13 M11 13 L8.6 10.6 M11 13 L13.4 10.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.8 L9.1 3.2 L10.9 2.8 L11.4 4.6 L13.2 5.1 L12.8 6.9 L14.2 8 L12.8 9.1 L13.2 10.9 L11.4 11.4 L10.9 13.2 L9.1 12.8 L8 14.2 L6.9 12.8 L5.1 13.2 L4.6 11.4 L2.8 10.9 L3.2 9.1 L1.8 8 L3.2 6.9 L2.8 5.1 L4.6 4.6 L5.1 2.8 L6.9 3.2 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M9.5 2.5 H13.5 V6.5 M13.5 2.5 L9 7 M6.5 13.5 H2.5 V9.5 M2.5 13.5 L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
