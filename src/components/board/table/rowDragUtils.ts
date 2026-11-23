import type React from "react";
import type { BoardTableGroup, BoardTableItem, RowDropEdge, RowDropPlacement } from "./types";

/** MIME type set on a row drag's `dataTransfer`. Firefox only starts a native drag once some data is set. */
export const ROW_DRAG_MIME = "application/x-board-row";

/**
 * Window event relayed from the drag source's own native `dragend` listener
 * (see `startRowDrag`). A row moved to another table is a new DOM node, and
 * the browser still sends `dragend` to the old, detached one, where only a
 * listener set directly on it can hear it. Read by `useRowDragSession`.
 */
export const ROW_DRAG_END_EVENT = "board-row-dragend";

/**
 * Which half of the hovered row the pointer is over, measured on the row's
 * real (layout) position. While `RowMoveAnimator` slides rows, their boxes
 * are offset by a running `translateY`. Measuring the moving box instead
 * made a row passing under the pointer trigger a swap back, so neighbors
 * kept trading places and the list trembled. The offset of every sliding
 * block around the row is read from its computed transform and removed.
 */
export function rowDragPlacement(event: React.DragEvent<HTMLElement>): RowDropPlacement {
  const row = event.currentTarget;
  const rect = row.getBoundingClientRect();
  let slide_offset = 0;
  for (let block = row.closest<HTMLElement>("[data-row-flip-key]"); block; block = block.parentElement?.closest<HTMLElement>("[data-row-flip-key]") ?? null) {
    const transform = window.getComputedStyle(block).transform;
    if (transform && transform !== "none") slide_offset += new DOMMatrixReadOnly(transform).m42;
  }
  const layout_middle = rect.top - slide_offset + rect.height / 2;
  return event.clientY > layout_middle ? "after" : "before";
}

/**
 * Reorders `list` for a row dragged over `over_id`, monday/dnd-kit style:
 * moving down it only takes the hovered row's slot once the pointer is past
 * that row's middle (`"after"`), moving up once it's above it (`"before"`).
 * That half row of hysteresis is what keeps two rows from swapping back and
 * forth under a resting pointer. Returns `list` itself when nothing changes.
 */
export function reorderTowardPointer<T extends { id: string }>(list: T[], dragged_id: string, over_id: string, placement: RowDropPlacement): T[] {
  const from = list.findIndex((entry) => entry.id === dragged_id);
  const to = list.findIndex((entry) => entry.id === over_id);
  if (from < 0 || to < 0 || from === to) return list;
  if (to > from && placement !== "after") return list;
  if (to < from && placement !== "before") return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The key of the group a root item currently sits in, or null when it isn't a root item. */
export function itemGroupKey(groups: BoardTableGroup[], item_id: string): string | null {
  for (const group of groups) {
    if (group.items.some((item) => item.id === item_id)) return group.key;
  }
  return null;
}

/** Whether a group can show a dragged row inside it right now (expanded, with its rows loaded). */
export function canPreviewRowInGroup(group: BoardTableGroup, collapsed_groups: Record<string, boolean>): boolean {
  return !collapsed_groups[group.key] && group.is_items_loaded !== false;
}

function withCount(group: BoardTableGroup, items: BoardTableItem[], delta: number): BoardTableGroup {
  return { ...group, items, item_count: group.item_count == null ? group.item_count : Math.max(0, group.item_count + delta) };
}

/**
 * Puts root item `item_id` at `index` of `target_group_key`'s list, counted on
 * that list without the item itself. Works both inside one table and across
 * two, keeping each table's `item_count` in step. Returns `groups` itself
 * (same reference) when the item is already there, so a `dragover` that
 * changes nothing doesn't re-render the board.
 */
export function placeItemInGroup(groups: BoardTableGroup[], item_id: string, target_group_key: string, index: number): BoardTableGroup[] {
  const source = groups.find((group) => group.items.some((item) => item.id === item_id));
  const target = groups.find((group) => group.key === target_group_key);
  if (!source || !target) return groups;

  const from = source.items.findIndex((item) => item.id === item_id);
  const moved = source.items[from];

  if (source.key === target.key) {
    const rest = source.items.filter((item) => item.id !== item_id);
    const to = Math.max(0, Math.min(rest.length, index));
    if (to === from) return groups;
    rest.splice(to, 0, moved);
    return groups.map((group) => (group.key === source.key ? { ...group, items: rest } : group));
  }

  const target_items = target.items.slice();
  target_items.splice(Math.max(0, Math.min(target_items.length, index)), 0, moved);
  return groups.map((group) => {
    if (group.key === source.key) return withCount(group, group.items.filter((item) => item.id !== item_id), -1);
    if (group.key === target.key) return withCount(group, target_items, 1);
    return group;
  });
}

/**
 * A root row dragged over another root row. Inside one table it takes the
 * hovered row's slot once the pointer crosses that row's middle in the
 * direction of travel (see `reorderTowardPointer`). Coming from another table
 * the row lands above or below the hovered one, depending on which half of
 * it the pointer is over, like monday.com.
 */
export function placeItemOverRow(
  groups: BoardTableGroup[],
  item_id: string,
  over_id: string,
  placement: RowDropPlacement
): BoardTableGroup[] {
  if (item_id === over_id) return groups;
  const source_key = itemGroupKey(groups, item_id);
  const target = groups.find((group) => group.items.some((item) => item.id === over_id));
  if (!source_key || !target) return groups;

  const over_index = target.items.findIndex((item) => item.id === over_id);
  if (source_key === target.key) {
    const items = reorderTowardPointer(target.items, item_id, over_id, placement);
    return items === target.items ? groups : groups.map((group) => (group.key === target.key ? { ...group, items } : group));
  }
  return placeItemInGroup(groups, item_id, target.key, placement === "after" ? over_index + 1 : over_index);
}

/** A root row dragged over a table's header (`"start"`, top of the list) or its footer (`"end"`, bottom of it). */
export function placeItemAtGroupEdge(groups: BoardTableGroup[], item_id: string, group_key: string, edge: RowDropEdge): BoardTableGroup[] {
  const target = groups.find((group) => group.key === group_key);
  if (!target) return groups;
  return placeItemInGroup(groups, item_id, group_key, edge === "start" ? 0 : target.items.length);
}
