import type { BoardItemDto } from "@/types/board-content";

// Pure helpers over the Table view's `items` tree, kept out of `TableBoardView`
// so the row menu's structural edits can be unit tested without rendering it.

/**
 * `items` is a tree (each root's `children` holds its subitems, recursively),
 * not a flat list, a subitem's id never appears at the top level. These
 * three helpers let every per-item mutation handler (rename, edit a cell,
 * delete, ...) find/update/remove an item regardless of how deep it's
 * nested, without each handler having to walk the tree itself.
 */
export const mapItemInTree = (
  items: BoardItemDto[],
  item_id: number,
  updater: (item: BoardItemDto) => BoardItemDto
): BoardItemDto[] =>
  items.map((item) =>
    item.id === item_id
      ? updater(item)
      : item.children.length
        ? { ...item, children: mapItemInTree(item.children, item_id, updater) }
        : item
  );

export const removeItemFromTree = (items: BoardItemDto[], item_id: number): BoardItemDto[] =>
  items
    .filter((item) => item.id !== item_id)
    .map((item) => (item.children.length ? { ...item, children: removeItemFromTree(item.children, item_id) } : item));

export const findItemInTree = (items: BoardItemDto[], item_id: number): BoardItemDto | undefined => {
  for (const item of items) {
    if (item.id === item_id) return item;
    const found = findItemInTree(item.children, item_id);
    if (found) return found;
  }
  return undefined;
};

/**
 * Inserts `created` right after `reference` among its siblings and shifts every
 * later sibling of the same table down by one, mirroring the backend's
 * `after_item_id` create. Works on any sibling list (the root items, or one
 * item's subitems), since `items` renders a table's rows in array order.
 */
export const insertAfterSibling = (siblings: BoardItemDto[], reference: BoardItemDto, created: BoardItemDto): BoardItemDto[] => {
  const shifted = siblings.map((sibling) =>
    sibling.group_id === created.group_id && sibling.position >= created.position ? { ...sibling, position: sibling.position + 1 } : sibling
  );
  const index = shifted.findIndex((sibling) => sibling.id === reference.id);
  return [...shifted.slice(0, index + 1), created, ...shifted.slice(index + 1)];
};

/** `item` and its whole subtree pointed at `group_id`, since a subitem's group is denormalized from its parent. */
export const withGroupInTree = (item: BoardItemDto, group_id: number): BoardItemDto => ({
  ...item,
  group_id,
  children: item.children.map((child) => withGroupInTree(child, group_id)),
});


/**
 * Places `created` (the row the server just made with `after_item_id`) right
 * below `reference`, as a root row or as one of its parent's subitems, and
 * keeps the parent's `subitem_count` in step.
 */
export const insertItemBelowInTree = (items: BoardItemDto[], reference: BoardItemDto, created: BoardItemDto): BoardItemDto[] =>
  reference.parent_id === null
    ? insertAfterSibling(items, reference, created)
    : mapItemInTree(items, reference.parent_id, (parent) => ({
        ...parent,
        subitem_count: parent.subitem_count + 1,
        children: insertAfterSibling(parent.children, reference, created),
      }));

/**
 * Moves `node` to where the server put it after a convert / move-to-item call
 * (`updated` is that response): out of its old parent (or the root list) and
 * to the end of its new one. Keeps everything the response does not carry, the
 * rollup counts included, from `node`, and re-points its subtree at the new
 * group. Both parents' `subitem_count` follow the move.
 */
export const relocateItemInTree = (items: BoardItemDto[], node: BoardItemDto, updated: BoardItemDto): BoardItemDto[] => {
  const relocated: BoardItemDto = {
    ...withGroupInTree(node, updated.group_id),
    parent_id: updated.parent_id,
    position: updated.position,
    values: updated.values,
  };
  const detached = removeItemFromTree(items, node.id).map((item) =>
    item.id === node.parent_id ? { ...item, subitem_count: Math.max(0, item.subitem_count - 1) } : item
  );

  return updated.parent_id === null
    ? [...detached, relocated]
    : mapItemInTree(detached, updated.parent_id, (parent) => ({
        ...parent,
        subitem_count: parent.subitem_count + 1,
        children: [...parent.children, relocated],
      }));
};
