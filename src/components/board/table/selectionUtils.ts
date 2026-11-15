import type { BoardTableGroup } from "./types";

/**
 * Row selection rules of the table, matching monday.com's Batch Actions:
 * - A selection holds items or subitems, never both. Checking a subitem
 *   clears every checked item and the other way around, so the selection bar
 *   always knows which set of actions applies.
 * - Shift + click checks every row between the last clicked row and this one,
 *   as long as both sit in the same list (the same table for items, the same
 *   parent for subitems).
 */
export type SelectionLevel = "item" | "subitem";

export type SelectedMap = Record<string, boolean>;

type RowLocation = {
  level: SelectionLevel;
  /** Ids of the rows in the same list, in display order. */
  sibling_ids: string[];
};

export function locateRow(groups: BoardTableGroup[], row_id: string): RowLocation | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.id === row_id) return { level: "item", sibling_ids: group.items.map((it) => it.id) };
      if (item.subs.some((sub) => sub.id === row_id)) return { level: "subitem", sibling_ids: item.subs.map((sub) => sub.id) };
    }
  }
  return null;
}

/** Ids of every root item on the table, to tell the two selection levels apart. */
function rootIdSet(groups: BoardTableGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
}

/** Keeps only the checked rows of `level`, dropping the other level. */
export function keepLevel(groups: BoardTableGroup[], selected_map: SelectedMap, level: SelectionLevel): SelectedMap {
  const root_ids = rootIdSet(groups);
  const next: SelectedMap = {};
  for (const [id, is_selected] of Object.entries(selected_map)) {
    if (!is_selected) continue;
    if (root_ids.has(id) === (level === "item")) next[id] = true;
  }
  return next;
}

/**
 * A row checkbox click. `anchor_id` is the row clicked before, used for the
 * Shift + click range. Returns the new selection.
 */
export function applyRowToggle(
  groups: BoardTableGroup[],
  selected_map: SelectedMap,
  row_id: string,
  anchor_id: string | null,
  is_range: boolean
): SelectedMap {
  const location = locateRow(groups, row_id);
  if (!location) return selected_map;
  const next = keepLevel(groups, selected_map, location.level);

  const anchor_index = is_range && anchor_id ? location.sibling_ids.indexOf(anchor_id) : -1;
  if (anchor_index !== -1) {
    const row_index = location.sibling_ids.indexOf(row_id);
    const [from, to] = anchor_index < row_index ? [anchor_index, row_index] : [row_index, anchor_index];
    location.sibling_ids.slice(from, to + 1).forEach((id) => (next[id] = true));
    return next;
  }

  if (next[row_id]) delete next[row_id];
  else next[row_id] = true;
  return next;
}

/** The subitem header's checkbox: checks every subitem of `item_id`, or clears them when all are already checked. */
export function toggleSubitemsOf(groups: BoardTableGroup[], selected_map: SelectedMap, item_id: string): SelectedMap {
  const item = groups.flatMap((group) => group.items).find((it) => it.id === item_id);
  if (!item || item.subs.length === 0) return selected_map;
  const next = keepLevel(groups, selected_map, "subitem");
  const is_all_selected = item.subs.every((sub) => next[sub.id]);
  item.subs.forEach((sub) => {
    if (is_all_selected) delete next[sub.id];
    else next[sub.id] = true;
  });
  return next;
}

/** Checked ids split by level, in display order. */
export function collectSelection(groups: BoardTableGroup[], selected_map: SelectedMap): { item_ids: string[]; subitem_ids: string[] } {
  const item_ids: string[] = [];
  const subitem_ids: string[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (selected_map[item.id]) item_ids.push(item.id);
      for (const sub of item.subs) if (selected_map[sub.id]) subitem_ids.push(sub.id);
    }
  }
  return { item_ids, subitem_ids };
}

/** What `BoardTable` reports through `onSelectionChange`. */
export type BoardTableSelection = ReturnType<typeof collectSelection>;
