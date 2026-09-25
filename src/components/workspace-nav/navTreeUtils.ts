import type { ReorderNavItemsPayload, WorkspaceNavNode } from "@/types/workspace";
import { locateNavNode } from "./helpers";

/** One row of the sidebar tree as it is currently shown (folders expanded or not). */
export type VisibleNavRow = {
  node: WorkspaceNavNode;
  depth: number;
  parent_id: number | null;
};

/** Where a dragged row lands relative to the row under the pointer. */
export type NavDropPosition = "before" | "after" | "inside";

export type NavDropTarget = {
  node_id: number;
  position: NavDropPosition;
};

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Keeps the rows whose label contains `query` plus every folder on the way
 * to them. A folder that matches keeps all of its content, like monday.com's
 * sidebar search. Returns the input tree untouched for an empty query.
 */
export const filterNavTree = (tree: WorkspaceNavNode[], query: string): WorkspaceNavNode[] => {
  const needle = normalize(query);
  if (!needle) return tree;

  const walk = (nodes: WorkspaceNavNode[]): WorkspaceNavNode[] =>
    nodes.flatMap((node) => {
      if (node.label.toLowerCase().includes(needle)) return [node];
      if (node.type !== "group") return [];
      const children = walk(node.children);
      return children.length > 0 ? [{ ...node, children }] : [];
    });

  return walk(tree);
};

/**
 * Flattens the tree into the rows the user can see, in display order. The
 * sidebar renders this flat list, so keyboard navigation, Shift+click range
 * selection and drag and drop all share one ordering.
 */
export const flattenVisibleNodes = (
  tree: WorkspaceNavNode[],
  isExpanded: (group_id: number) => boolean
): VisibleNavRow[] => {
  const rows: VisibleNavRow[] = [];
  const walk = (nodes: WorkspaceNavNode[], depth: number, parent_id: number | null) => {
    for (const node of nodes) {
      rows.push({ node, depth, parent_id });
      if (node.type === "group" && isExpanded(node.id)) walk(node.children, depth + 1, node.id);
    }
  };
  walk(tree, 0, null);
  return rows;
};

/** Whether `candidate_id` sits anywhere inside `ancestor` (used to block dropping a folder into itself). */
export const isNavDescendant = (ancestor: WorkspaceNavNode, candidate_id: number): boolean =>
  ancestor.children.some((child) => child.id === candidate_id || isNavDescendant(child, candidate_id));

/**
 * Reads the drop intent from the pointer's position inside the hovered row:
 * a folder splits into top quarter (before), middle half (inside) and bottom
 * quarter (after), a board into top half (before) and bottom half (after).
 */
export const resolveDropPosition = (over_node: WorkspaceNavNode, pointer_y: number, over_rect: { top: number; height: number }): NavDropPosition => {
  const ratio = over_rect.height > 0 ? (pointer_y - over_rect.top) / over_rect.height : 0.5;
  if (over_node.type === "group") {
    if (ratio < 0.25) return "before";
    if (ratio > 0.75) return "after";
    return "inside";
  }
  return ratio < 0.5 ? "before" : "after";
};

/**
 * Turns a drop into the reorder API payload, or null when nothing would
 * change or the drop is not allowed (onto itself, into its own subtree).
 */
export const buildDropPayload = (
  tree: WorkspaceNavNode[],
  moved_id: number,
  target: NavDropTarget
): ReorderNavItemsPayload | null => {
  if (moved_id === target.node_id) return null;

  const moved = locateNavNode(tree, moved_id);
  const over = locateNavNode(tree, target.node_id);
  if (!moved || !over) return null;
  if (moved.node.type === "group" && (isNavDescendant(moved.node, target.node_id))) return null;

  let target_parent_id: number | null;
  let target_ordered_ids: number[];

  if (target.position === "inside") {
    if (over.node.type !== "group") return null;
    target_parent_id = over.node.id;
    target_ordered_ids = [...over.node.children.map((child) => child.id).filter((id) => id !== moved_id), moved_id];
  } else {
    target_parent_id = over.parent_id;
    const sibling_ids = over.siblings.map((sibling) => sibling.id).filter((id) => id !== moved_id);
    const over_index = sibling_ids.indexOf(over.node.id);
    const insert_index = target.position === "before" ? over_index : over_index + 1;
    target_ordered_ids = [...sibling_ids.slice(0, insert_index), moved_id, ...sibling_ids.slice(insert_index)];
  }

  const is_same_parent = target_parent_id === moved.parent_id;
  if (is_same_parent && target_ordered_ids.every((id, index) => moved.siblings[index]?.id === id)) return null;

  const payload: ReorderNavItemsPayload = { moved_item_id: moved_id, target_parent_id, target_ordered_ids };
  if (!is_same_parent) {
    const source_ordered_ids = moved.siblings.map((sibling) => sibling.id).filter((id) => id !== moved_id);
    if (source_ordered_ids.length > 0) {
      payload.source_parent_id = moved.parent_id;
      payload.source_ordered_ids = source_ordered_ids;
    }
  }
  return payload;
};

/**
 * Applies a reorder payload to a local copy of the tree, so a drop shows
 * right away while the request is still in flight.
 */
export const applyReorderToTree = (tree: WorkspaceNavNode[], payload: ReorderNavItemsPayload): WorkspaceNavNode[] => {
  const moved = locateNavNode(tree, payload.moved_item_id)?.node;
  if (!moved) return tree;

  const moved_copy: WorkspaceNavNode = { ...moved, parent_id: payload.target_parent_id };

  const rebuild = (nodes: WorkspaceNavNode[], parent_id: number | null): WorkspaceNavNode[] => {
    let next = nodes.filter((node) => node.id !== payload.moved_item_id);
    if (parent_id === payload.target_parent_id) {
      const by_id = new Map(next.map((node) => [node.id, node]));
      by_id.set(moved_copy.id, moved_copy);
      next = payload.target_ordered_ids.map((id) => by_id.get(id)).filter((node): node is WorkspaceNavNode => Boolean(node));
    }
    return next.map((node) => (node.type === "group" ? { ...node, children: rebuild(node.children, node.id) } : node));
  };

  return rebuild(tree, null);
};

/** Splits `label` around every case insensitive occurrence of `query`, for highlighting search matches. */
export const splitByMatch = (label: string, query: string): { text: string; is_match: boolean }[] => {
  const needle = normalize(query);
  if (!needle) return [{ text: label, is_match: false }];

  const parts: { text: string; is_match: boolean }[] = [];
  const haystack = label.toLowerCase();
  let cursor = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push({ text: label.slice(cursor, index), is_match: false });
    parts.push({ text: label.slice(index, index + needle.length), is_match: true });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < label.length) parts.push({ text: label.slice(cursor), is_match: false });
  return parts;
};
