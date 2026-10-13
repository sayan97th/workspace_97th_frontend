"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CellValue, ColumnDef, ConnectItemOption, MirroredColumnOption, StatusDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { contrastFg, findDef } from "../colorUtils";
import StatusMenu from "../menus/StatusMenu";
import PopoverPanel from "../menus/PopoverPanel";
import { connectItemIds } from "./ConnectItemsCell";
import { useCellTooltip } from "./CellTooltip";
import "./mirror-cell.css";

/** Items listed in the popover before "Show N more items". */
const VISIBLE_POPOVER_ITEMS = 5;
/** Color of the share of items with no label, like monday's blank status. */
const EMPTY_LABEL_COLOR = "#c4c4c4";
/** Mirrored kinds drawn as colored pills and a label bar. */
const LABEL_KINDS = new Set(["status", "label"]);

/**
 * Mirror columns whose connected items were fetched before the mirror existed, so the cached
 * items lack its values. Each one is fetched again once, whichever of its cells notices first.
 */
const refetched_mirrors = new Set<string>();

interface MirrorCellProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  state: BoardTableState;
  actions: BoardTableActions;
}

interface MirrorEntry {
  item: ConnectItemOption;
  value: CellValue;
}

/** One share of a label bar: a label (or no label) and the linked items that hold it. */
interface LabelShare {
  key: string;
  label: string;
  color: string;
  entries: MirrorEntry[];
}

/** What the items popover lists: one label's share, or every linked item with its value. */
type PopoverContent = { kind: "share"; share_key: string } | { kind: "all" };

function percentText(count: number, total: number): string {
  const percent = total === 0 ? 0 : (count / total) * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

function asLabelId(value: CellValue): string | null {
  return typeof value === "string" && value ? value : typeof value === "number" ? String(value) : null;
}

/** The linked items grouped by label, in the mirrored column's label order, the unlabeled ones last. */
function labelShares(entries: MirrorEntry[], mirrored: MirroredColumnOption): LabelShare[] {
  const shares = mirrored.options.map((option) => ({ key: option.id, label: option.label, color: option.color, entries: [] as MirrorEntry[] }));
  const empty: LabelShare = { key: "__empty__", label: "No label", color: EMPTY_LABEL_COLOR, entries: [] };
  for (const entry of entries) {
    const id = asLabelId(entry.value);
    const share = id ? shares.find((candidate) => candidate.key === id) : undefined;
    (share ?? empty).entries.push(entry);
  }
  return [...shares, empty].filter((share) => share.entries.length > 0);
}

/** A non-label mirrored value as text: the connected board's own display text when it sent one. */
function valueText(entry: MirrorEntry, mirrored: MirroredColumnOption): string {
  const text = entry.item.texts[mirrored.id];
  if (text) return text;
  const { value } = entry;
  if (typeof value === "boolean") return value ? "Checked" : "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

/** A whole cell's text for a non-label mirror: numbers add up, checkboxes count, the rest are listed. */
function summaryText(entries: MirrorEntry[], mirrored: MirroredColumnOption): string {
  if (mirrored.type === "number") {
    const numbers = entries.filter((entry) => entry.value !== null && entry.value !== "").map((entry) => Number(entry.value)).filter(Number.isFinite);
    return numbers.length === 0 ? "" : String(Math.round(numbers.reduce((sum, number) => sum + number, 0) * 100) / 100);
  }
  if (mirrored.type === "checkbox") {
    const checked = entries.filter((entry) => entry.value === true || entry.value === "true").length;
    return `${checked}/${entries.length} checked`;
  }
  return [...new Set(entries.map((entry) => valueText(entry, mirrored)).filter(Boolean))].join(", ");
}

/**
 * A Mirror cell, monday.com style: the values of `mirror.mirrored_column_id` on the items the
 * row links through `mirror.source_column_id` (a Connect boards column). A Status or Label column
 * shows one item as its pill (editable, the change is saved on the connected item) and several
 * as a label bar whose segments name their share and list their items. Other kinds show text
 * (numbers add up) and list the items with their values on click.
 */
export default function MirrorCell({ node_id, column, values, state, actions }: MirrorCellProps) {
  const scope_key = `${node_id}:${column.id}`;
  const is_menu_open = state.open_cell_menu_key === scope_key;
  const source_id = column.mirror?.source_column_id;
  const mirrored_id = column.mirror?.mirrored_column_id;
  const options = source_id ? state.connect_options[source_id] : undefined;
  const [popover, setPopover] = useState<PopoverContent | null>(null);

  useEffect(() => {
    if (source_id) actions.ensureConnectOptions(source_id);
  }, [source_id, actions]);

  const board = options?.boards.find((candidate) => candidate.mirrored_columns.some((mirrored) => mirrored.id === mirrored_id));
  const mirrored = board?.mirrored_columns.find((candidate) => candidate.id === mirrored_id);

  // Cached before this mirror existed: fetch the connected items again, once per mirror.
  useEffect(() => {
    if (!source_id || !mirrored_id || !options || mirrored || options.hidden_board_count > 0 || options.boards.length === 0) return;
    const key = `${source_id}:${mirrored_id}`;
    if (refetched_mirrors.has(key)) return;
    refetched_mirrors.add(key);
    actions.ensureConnectOptions(source_id, true);
  }, [source_id, mirrored_id, options, mirrored, actions]);

  useEffect(() => {
    if (!is_menu_open) setPopover(null);
  }, [is_menu_open]);

  const linked_ids = source_id ? connectItemIds(values[source_id]) : [];
  const items_by_id = useMemo(() => new Map((board?.items ?? []).map((item) => [item.id, item])), [board]);
  const entries: MirrorEntry[] = mirrored
    ? linked_ids.flatMap((id) => {
        const item = items_by_id.get(id);
        return item ? [{ item, value: item.values[mirrored.id] ?? null }] : [];
      })
    : [];

  if (!source_id || !mirrored_id) {
    const can_set_up = !state.read_only && state.can_edit_structure;
    return (
      <div className="mirror-cell">
        {can_set_up ? (
          <button type="button" className="mirror-cell__placeholder" onClick={() => actions.openConfigEditor("mirror", column.id)}>
            Set up mirror
          </button>
        ) : (
          <span className="mirror-cell__placeholder">-</span>
        )}
      </div>
    );
  }

  if (!mirrored || entries.length === 0) return <div className="mirror-cell" />;

  const openPopover = (content: PopoverContent) => {
    setPopover(content);
    actions.openCellMenu(scope_key);
  };

  const items_popover = is_menu_open && popover && (
    <MirrorItemsPopover
      content={popover}
      entries={entries}
      mirrored={mirrored}
      onOpenItem={(item) => actions.openLinkedItem({ board_id: item.board_id, board_name: board?.name ?? "", item_id: item.id, view_id: item.view_id })}
      onClose={actions.closeCellMenu}
    />
  );

  if (LABEL_KINDS.has(mirrored.type)) {
    // One linked item: its own pill, which edits the connected item's label.
    if (entries.length === 1) {
      const [entry] = entries;
      const def = findDef(mirrored.options, asLabelId(entry.value) ?? "");
      const background = def?.color || EMPTY_LABEL_COLOR;
      const can_edit = !state.read_only && Boolean(actions.canEditCell(node_id, column.id));
      const save = (next: CellValue) => {
        actions.closeCellMenu();
        void actions.setLinkedItemValue(board!.id, entry.item.id, mirrored.id, next).catch(() => {});
      };
      return (
        <div className="mirror-cell">
          <MirrorPill
            label={def?.label ?? ""}
            background={background}
            tooltip={`${def?.label || "No label"}, mirrored from "${entry.item.name}"`}
            onClick={can_edit ? () => openPopover({ kind: "all" }) : undefined}
          />
          {is_menu_open && popover && can_edit && (
            <StatusMenu
              status_defs={mirrored.options.filter((option) => option.is_active !== false) as StatusDef[]}
              selected_id={def?.id ?? null}
              onPick={(id) => save(id)}
              onClear={() => save(null)}
              onClose={actions.closeCellMenu}
            />
          )}
        </div>
      );
    }

    const shares = labelShares(entries, mirrored);
    return (
      <div className="mirror-cell">
        <div className="mirror-cell__bar" role="group" aria-label={`${mirrored.label} of ${entries.length} linked items`}>
          {shares.map((share) => (
            <ShareSegment key={share.key} share={share} total={entries.length} onClick={() => openPopover({ kind: "share", share_key: share.key })} />
          ))}
        </div>
        {items_popover}
      </div>
    );
  }

  const text = summaryText(entries, mirrored);
  return (
    <div className="mirror-cell">
      <MirrorText text={text} onClick={() => openPopover({ kind: "all" })} />
      {items_popover}
    </div>
  );
}

function MirrorPill({ label, background, tooltip, onClick }: { label: string; background: string; tooltip: string; onClick?: () => void }) {
  const { anchor_props, hide, tooltip: bubble } = useCellTooltip<HTMLButtonElement>(tooltip);
  const style: CSSProperties = { background, color: contrastFg(background) };
  // Read only (several items, or no edit rights) it stays a button without an action, so the tooltip still works.
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        aria-disabled={!onClick || undefined}
        className="mirror-cell__pill"
        style={{ ...style, cursor: onClick ? "pointer" : "default" }}
        onClick={() => {
          hide();
          onClick?.();
        }}
      >
        <span>{label}</span>
      </button>
      {bubble}
    </>
  );
}

/** One label's share of the bar: "Done 10/11 90.9%" on hover, its items on click. */
function ShareSegment({ share, total, onClick }: { share: LabelShare; total: number; onClick: () => void }) {
  const count = share.entries.length;
  const summary = `${share.label} ${count}/${total} ${percentText(count, total)}`;
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(summary);
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        aria-label={summary}
        className="mirror-cell__segment"
        style={{ width: `${(count / total) * 100}%`, background: share.color }}
        onClick={() => {
          hide();
          onClick();
        }}
      />
      {tooltip}
    </>
  );
}

function MirrorText({ text, onClick }: { text: string; onClick: () => void }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(text, { only_when_truncated: true });
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        className="mirror-cell__text"
        onClick={() => {
          hide();
          onClick();
        }}
      >
        {text || "-"}
      </button>
      {tooltip}
    </>
  );
}

interface MirrorItemsPopoverProps {
  content: PopoverContent;
  entries: MirrorEntry[];
  mirrored: MirroredColumnOption;
  onOpenItem: (item: ConnectItemOption) => void;
  onClose: () => void;
}

/** The linked items behind a mirror cell: one label's share ("Done - 90.9% (10/11)"), or all with their values. */
function MirrorItemsPopover({ content, entries, mirrored, onOpenItem, onClose }: MirrorItemsPopoverProps) {
  const [is_expanded, setIsExpanded] = useState(false);
  const is_label_kind = LABEL_KINDS.has(mirrored.type);

  let title: string;
  let listed: MirrorEntry[];
  if (content.kind === "share") {
    const share = labelShares(entries, mirrored).find((candidate) => candidate.key === content.share_key);
    listed = share?.entries ?? [];
    title = `${share?.label ?? ""} - ${percentText(listed.length, entries.length)} (${listed.length}/${entries.length})`;
  } else {
    listed = entries;
    title = `${mirrored.label} (${entries.length} ${entries.length === 1 ? "item" : "items"})`;
  }

  const shown = is_expanded ? listed : listed.slice(0, VISIBLE_POPOVER_ITEMS);
  const hidden_count = listed.length - shown.length;

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full mt-1 -translate-x-1/2">
      <div
        className="mirror-items"
        role="dialog"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="mirror-items__title">{title}</div>
        <div className="mirror-items__list shell-scrollbar">
          {shown.map((entry) => (
            <MirrorItemRow key={entry.item.id} entry={entry} value_text={is_label_kind ? null : valueText(entry, mirrored)} onOpen={() => onOpenItem(entry.item)} />
          ))}
        </div>
        {hidden_count > 0 && (
          <button type="button" className="mirror-items__more" onClick={() => setIsExpanded(true)}>
            Show {hidden_count} more {hidden_count === 1 ? "item" : "items"}
          </button>
        )}
      </div>
    </PopoverPanel>
  );
}

function MirrorItemRow({ entry, value_text, onOpen }: { entry: MirrorEntry; value_text: string | null; onOpen: () => void }) {
  const name = entry.item.name || "Untitled item";
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLSpanElement>(name, { only_when_truncated: true });
  const style = { "--mirror-items-color": entry.item.color ?? undefined } as CSSProperties;
  const content = (
    <>
      <span {...anchor_props} className="mirror-items__name">
        {name}
      </span>
      {value_text && <span className="mirror-items__value">{value_text}</span>}
      {tooltip}
    </>
  );
  return (
    <button
      type="button"
      className="mirror-items__row"
      style={style}
      onClick={() => {
        hide();
        onOpen();
      }}
    >
      {content}
    </button>
  );
}
