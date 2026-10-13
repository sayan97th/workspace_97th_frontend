"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CellValue, ColumnDef, ConnectColumnOptions, ConnectItemOption } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import ConnectItemsPicker from "../menus/ConnectItemsPicker";
import ConnectBoardSettings from "../menus/ConnectBoardSettings";
import PopoverPanel from "../menus/PopoverPanel";
import { useCellTooltip } from "./CellTooltip";
import "./connect-items.css";

/** Names listed in the "+N" bubble's tooltip before it sums up the rest. */
const MAX_COUNT_TOOLTIP_NAMES = 8;

interface ConnectItemsCellProps {
  node_id: string;
  column: ColumnDef;
  value: CellValue;
  state: BoardTableState;
  actions: BoardTableActions;
}

/** A Connect boards cell value as item ids. Automations may store numbers, the table stores strings. */
export function connectItemIds(value: CellValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((id) => (typeof id === "string" || typeof id === "number" ? [String(id)] : []));
}

/** Every item of the column's connected boards by id, for resolving a cell's linked ids. */
function indexItems(options: ConnectColumnOptions | undefined): Map<string, ConnectItemOption> {
  const index = new Map<string, ConnectItemOption>();
  for (const board of options?.boards ?? []) for (const item of board.items) index.set(item.id, item);
  return index;
}

/** The boards a Connect boards column links to, falling back to the single board older columns stored. */
export function connectedBoardIds(column: ColumnDef): string[] {
  return column.linked_board_ids ?? (column.linked_board_id ? [column.linked_board_id] : []);
}

/**
 * A Connect boards cell, monday.com style: the first linked item as a chip with its group color,
 * the rest as a dark "+N" bubble, a hover "+" to link more, and the "Choose items" picker. The
 * chip opens the linked item and shows its full name in a tooltip. A column that has no board
 * yet sends board owners to its "Boards settings".
 */
export default function ConnectItemsCell({ node_id, column, value, state, actions }: ConnectItemsCellProps) {
  const scope_key = `${node_id}:${column.id}`;
  const is_menu_open = state.open_cell_menu_key === scope_key;
  const is_configured = connectedBoardIds(column).length > 0;
  const options = state.connect_options[column.id];
  const can_edit = Boolean(actions.canEditCell(node_id, column.id));
  const can_edit_settings = !state.read_only && state.can_edit_structure;
  const allow_multiple = column.connect?.allow_multiple_items ?? true;

  const linked_ids = connectItemIds(value);
  const item_index = useMemo(() => indexItems(options), [options]);
  // Ids whose item was deleted, or sits on a board the viewer may not open, are not shown.
  const linked_items = linked_ids.map((id) => item_index.get(id)).filter((item): item is ConnectItemOption => Boolean(item));

  // Loads the column's connected boards once for all its cells (`ensureConnectOptions` dedupes).
  useEffect(() => {
    if (is_configured) actions.ensureConnectOptions(column.id);
  }, [is_configured, column.id, actions]);

  // Opening the picker fetches again, so new items and renames on the other board show up.
  useEffect(() => {
    if (is_menu_open && is_configured) actions.ensureConnectOptions(column.id, true);
  }, [is_menu_open, is_configured, column.id, actions]);

  // The picker's "Boards settings" swaps the popover to the column settings card, in place.
  const [is_settings_view, setIsSettingsView] = useState(false);
  useEffect(() => {
    if (!is_menu_open) setIsSettingsView(false);
  }, [is_menu_open]);

  const openMenu = () => actions.openCellMenu(scope_key);
  const openSettings = () => actions.openConfigEditor("connect_board", column.id);

  const toggleItem = (item_id: string) => {
    const is_linked = linked_ids.includes(item_id);
    const next_ids = is_linked ? linked_ids.filter((id) => id !== item_id) : allow_multiple ? [...linked_ids, item_id] : [item_id];
    actions.setCellValue(node_id, column.id, next_ids.length > 0 ? next_ids : null);
    // A single item cell is done once it holds its item.
    if (!allow_multiple && !is_linked) actions.closeCellMenu();
  };

  const createItem = async (board_id: string, group_id: string, name: string) => {
    const created = await actions.createConnectItem(column.id, board_id, group_id, name);
    if (created) toggleItem(created.id);
  };

  if (!is_configured) {
    return (
      <div className="connect-cell">
        {can_edit_settings && <button type="button" className="connect-cell__hit-area" onClick={openSettings} aria-label="Connect this column to a board" />}
        <div className="connect-cell__content">
          <span className="connect-cell__placeholder">{can_edit_settings ? "Connect a board" : ""}</span>
        </div>
      </div>
    );
  }

  const [first_item, ...other_items] = linked_items;
  const is_loading = !options && linked_ids.length > 0;
  // Like monday.com, the contents only show to users who can open every connected board.
  const is_restricted = (options?.hidden_board_count ?? 0) > 0;

  return (
    <div className="connect-cell">
      <button type="button" className="connect-cell__hit-area" onClick={openMenu} aria-label={`Choose items for ${column.title}`} aria-haspopup="dialog" aria-expanded={is_menu_open} />
      <div className="connect-cell__content">
        {can_edit && first_item && (
          <button type="button" className="connect-cell__add" onClick={openMenu} aria-label="Link more items">
            <PlusIcon />
          </button>
        )}
        {is_loading && <span className="connect-cell__skeleton" aria-label="Loading linked items" />}
        {is_restricted && <RestrictedNotice />}
        {first_item && <ConnectItemChip item={first_item} />}
        {other_items.length > 0 && <ConnectCountBubble items={other_items} onClick={openMenu} />}
        {!first_item && !is_loading && !is_restricted && can_edit && (
          <span className="connect-cell__empty-add" aria-hidden="true">
            <PlusIcon />
          </span>
        )}
      </div>
      {is_menu_open && is_settings_view && (
        <PopoverPanel onClose={actions.closeCellMenu} unstyled className="left-1/2 top-full mt-1 -translate-x-1/2">
          <ConnectBoardSettings column={column} actions={actions} onClose={actions.closeCellMenu} />
        </PopoverPanel>
      )}
      {is_menu_open && !is_settings_view && (
        <ConnectItemsPicker
          column_id={column.id}
          options={options}
          selected_ids={linked_ids}
          can_edit={can_edit}
          can_edit_settings={can_edit_settings}
          onToggle={toggleItem}
          onCreateItem={createItem}
          onOpenSettings={() => setIsSettingsView(true)}
          onClose={actions.closeCellMenu}
        />
      )}
    </div>
  );
}

/** One linked item: its group color bar and name, opening the item, full name in a tooltip. */
function ConnectItemChip({ item }: { item: ConnectItemOption }) {
  const name = item.name || "Untitled item";
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLAnchorElement>(name);
  const style = { "--connect-cell-chip-color": item.color ?? undefined } as CSSProperties;
  const content = <span className="connect-cell__chip-name">{name}</span>;

  return (
    <>
      {item.href ? (
        <Link {...anchor_props} href={item.href} className="connect-cell__chip" style={style} onClick={hide}>
          {content}
        </Link>
      ) : (
        <span className="connect-cell__chip" style={style}>
          {content}
        </span>
      )}
      {tooltip}
    </>
  );
}

/** The "+N" bubble for the linked items that did not fit, naming them in its tooltip. */
function ConnectCountBubble({ items, onClick }: { items: ConnectItemOption[]; onClick: () => void }) {
  const listed = items.slice(0, MAX_COUNT_TOOLTIP_NAMES);
  const rest = items.length - listed.length;
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(
    <span className="connect-cell__count-names">
      {listed.map((item) => (
        <span key={item.id}>{item.name || "Untitled item"}</span>
      ))}
      {rest > 0 && <span>and {rest} more</span>}
    </span>
  );

  return (
    <>
      <button
        type="button"
        {...anchor_props}
        className="connect-cell__count"
        aria-label={`Show all ${items.length + 1} linked items`}
        onClick={() => {
          hide();
          onClick();
        }}
      >
        +{items.length}
      </button>
      {tooltip}
    </>
  );
}

/** A lock in place of the contents of a column whose boards the viewer cannot all open. */
function RestrictedNotice() {
  const { anchor_props, tooltip } = useCellTooltip<HTMLSpanElement>("Only users with access to all connected boards can see this column's contents.");
  return (
    <>
      <span {...anchor_props} tabIndex={0} className="connect-cell__restricted" aria-label="Contents hidden, you cannot open every connected board">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 7 V5.2 a2.5 2.5 0 0 1 5 0 V7" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </span>
      {tooltip}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
