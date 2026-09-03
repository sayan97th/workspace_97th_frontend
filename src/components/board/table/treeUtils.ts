import type { BoardTableGroup, BoardTableItem, BoardTableNode } from "./types";

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
