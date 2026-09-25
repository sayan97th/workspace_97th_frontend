import type { BoardTableGroup, BoardTableItem, BoardTableNode, ColumnDef } from "./types";

export interface ItemLocation {
  kind: "item";
  group_key: string;
  item_index: number;
}

export interface SubLocation {
  kind: "sub";
  group_key: string;
  item_id: string;
  item_index: number;
  sub_index: number;
}

export type NodeLocation = ItemLocation | SubLocation;

export function locateNode(groups: BoardTableGroup[], node_id: string): NodeLocation | null {
  for (const group of groups) {
    for (let item_index = 0; item_index < group.items.length; item_index++) {
      const item = group.items[item_index];
      if (item.id === node_id) return { kind: "item", group_key: group.key, item_index };
      const sub_index = item.subs.findIndex((sub) => sub.id === node_id);
      if (sub_index >= 0) {
        return { kind: "sub", group_key: group.key, item_id: item.id, item_index, sub_index };
      }
    }
  }
  return null;
}

/** Applies `updater` to the item or subitem matching `node_id`, wherever it lives. */
export function updateNodeById<T extends BoardTableNode>(
  groups: BoardTableGroup[],
  node_id: string,
  updater: (node: T) => T
): BoardTableGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.id === node_id) return updater(item as unknown as T) as unknown as BoardTableItem;
      const sub_index = item.subs.findIndex((sub) => sub.id === node_id);
      if (sub_index < 0) return item;
      const next_subs = item.subs.slice();
      next_subs[sub_index] = updater(next_subs[sub_index] as unknown as T) as unknown as BoardTableNode;
      return { ...item, subs: next_subs };
    }),
  }));
}

export function findNode(groups: BoardTableGroup[], node_id: string): BoardTableNode | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.id === node_id) return item;
      const sub = item.subs.find((s) => s.id === node_id);
      if (sub) return sub;
    }
  }
  return null;
}

export function findGroup(groups: BoardTableGroup[], group_key: string): BoardTableGroup | null {
  return groups.find((g) => g.key === group_key) || null;
}

export function findItem(groups: BoardTableGroup[], item_id: string): BoardTableItem | null {
  for (const group of groups) {
    const item = group.items.find((it) => it.id === item_id);
    if (item) return item;
  }
  return null;
}

export interface RemovalResult {
  groups: BoardTableGroup[];
  removed_item: BoardTableItem | null;
  removed_sub: BoardTableNode | null;
  location: NodeLocation | null;
}

export function removeNodeById(groups: BoardTableGroup[], node_id: string): RemovalResult {
  const location = locateNode(groups, node_id);
  if (!location) return { groups, removed_item: null, removed_sub: null, location: null };

  if (location.kind === "item") {
    let removed_item: BoardTableItem | null = null;
    const next_groups = groups.map((group) => {
      if (group.key !== location.group_key) return group;
      const found = group.items[location.item_index];
      removed_item = found;
      return { ...group, items: group.items.filter((it) => it.id !== node_id) };
    });
    return { groups: next_groups, removed_item, removed_sub: null, location };
  }

  let removed_sub: BoardTableNode | null = null;
  const next_groups = groups.map((group) => {
    if (group.key !== location.group_key) return group;
    return {
      ...group,
      items: group.items.map((item) => {
        if (item.id !== location.item_id) return item;
        const found = item.subs[location.sub_index];
        removed_sub = found;
        return { ...item, subs: item.subs.filter((s) => s.id !== node_id) };
      }),
    };
  });
  return { groups: next_groups, removed_item: null, removed_sub, location };
}

export function insertItemIntoGroup(
  groups: BoardTableGroup[],
  group_key: string,
  item: BoardTableItem,
  at_index?: number
): BoardTableGroup[] {
  return groups.map((group) => {
    if (group.key !== group_key) return group;
    const items = group.items.slice();
    const index = at_index == null ? items.length : Math.max(0, Math.min(items.length, at_index));
    items.splice(index, 0, item);
    return { ...group, items };
  });
}

export function insertSubIntoItem(
  groups: BoardTableGroup[],
  item_id: string,
  sub: BoardTableNode,
  at_index?: number
): BoardTableGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.id !== item_id) return item;
      const subs = item.subs.slice();
      const index = at_index == null ? subs.length : Math.max(0, Math.min(subs.length, at_index));
      subs.splice(index, 0, sub);
      return { ...item, subs };
    }),
  }));
}

export interface VisibleRow {
  node_id: string;
  /** The group (table) the row sits in, a subitem shares its parent's group. */
  group_key: string;
  /** The value columns actually rendered for this row (item vs. subitem each have their own set) — an active cell's arrow-key navigation only ever moves within this list. */
  columns: ColumnDef[];
}

/**
 * Every row currently on-screen, in top-to-bottom display order: root items,
 * and — only when that item is expanded (`open_map`) and has any — its
 * subitems right after it. Rows inside a collapsed group are skipped
 * entirely. Mirrors exactly what `GroupSection`/`ItemRow`/`SubitemRow`
 * render, so arrow-key cell navigation never lands on a row the viewer can't
 * actually see.
 */
export function visibleRowSequence(
  groups: BoardTableGroup[],
  collapsed_groups: Record<string, boolean>,
  open_map: Record<string, boolean>
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const group of groups) {
    if (collapsed_groups[group.key]) continue;
    const columns = group.base_columns.concat(group.custom_columns);
    const sub_columns = group.sub_base_columns.concat(group.sub_custom_columns);
    for (const item of group.items) {
      rows.push({ node_id: item.id, group_key: group.key, columns });
      if (open_map[item.id] && item.subs.length > 0) {
        for (const sub of item.subs) {
          rows.push({ node_id: sub.id, group_key: group.key, columns: sub_columns });
        }
      }
    }
  }
  return rows;
}

/**
 * Valid predecessor candidates for one row's Dependency cell: every other
 * row (item or subitem, across every group) except `node_id` itself and
 * anything already reachable *from* `node_id` by walking existing
 * dependency edges forward, since picking one of those would close a cycle
 * (`node_id` would end up depending, directly or transitively, on something
 * that already depends on it). Mirrors the Gantt view's own
 * `getDependencyCandidates` (`TableBoardView.tsx`), generalized to items and
 * subitems alike since the Table view's own column isn't root-item-only.
 */
export function dependencyCandidates(groups: BoardTableGroup[], node_id: string, column_id: string): { id: string; name: string }[] {
  const all_nodes: BoardTableNode[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      all_nodes.push(item);
      all_nodes.push(...item.subs);
    }
  }

  const successors = new Map<string, string[]>();
  for (const node of all_nodes) {
    const raw = node.values[column_id];
    if (!Array.isArray(raw)) continue;
    for (const predecessor_id of raw as string[]) {
      const list = successors.get(predecessor_id) ?? [];
      list.push(node.id);
      successors.set(predecessor_id, list);
    }
  }

  const unreachable = new Set<string>([node_id]);
  const queue = [node_id];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const successor_id of successors.get(current) ?? []) {
      if (!unreachable.has(successor_id)) {
        unreachable.add(successor_id);
        queue.push(successor_id);
      }
    }
  }

  return all_nodes.filter((node) => !unreachable.has(node.id)).map((node) => ({ id: node.id, name: node.name }));
}

export function reorderWithinList<T extends { id: string }>(list: T[], dragged_id: string, target_id: string): T[] {
  if (dragged_id === target_id) return list;
  const from = list.findIndex((x) => x.id === dragged_id);
  const to = list.findIndex((x) => x.id === target_id);
  if (from < 0 || to < 0) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
