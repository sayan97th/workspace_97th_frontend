/**
 * Pure ordering and overflow math for the board's tab bar. Kept free of React
 * so the rules can be unit tested on their own.
 */

type TabId = number | string;

type SortableView = {
  id: number;
  position: number;
  pinned: boolean;
  is_primary: boolean;
};

/**
 * Orders every view of a board for display.
 *
 * Without a personal order, the primary tab comes first, then pinned tabs,
 * then the rest, each group by `position`. With a personal order, that order
 * wins outright (the primary tab included, so it can be dragged too), and any
 * view missing from it (created after it was last saved) is appended in its
 * default place among the rest.
 */
export function sortBoardViews<T extends SortableView>(views: T[], personal_order: number[] | null): T[] {
  const by_default = views
    .slice()
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || Number(b.pinned) - Number(a.pinned) || a.position - b.position
    );
  if (!personal_order || personal_order.length === 0) return by_default;

  const rank = new Map(personal_order.map((id, index) => [id, index]));
  const ordered = by_default.filter((view) => rank.has(view.id));
  const unordered = by_default.filter((view) => !rank.has(view.id));
  ordered.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return [...ordered, ...unordered];
}

/**
 * Applies a new order of the tabs currently on screen to the full tab list.
 * Tabs that are not on screen (collapsed into "More" or hidden for the viewer)
 * keep their slots, and the on screen tabs fill the remaining slots in their
 * new order. This keeps a drag from shuffling tabs the viewer can't see.
 */
export function mergeReorderedIds(all_ids: TabId[], reordered_visible_ids: TabId[]): TabId[] {
  const visible = new Set(reordered_visible_ids);
  const queue = reordered_visible_ids.slice();
  return all_ids.map((id) => (visible.has(id) ? (queue.shift() as TabId) : id));
}

/** Moves `id` to `target_index` in `ids`, clamped to the list's bounds. */
export function moveId(ids: TabId[], id: TabId, target_index: number): TabId[] {
  const rest = ids.filter((other) => other !== id);
  const index = Math.max(0, Math.min(target_index, rest.length));
  rest.splice(index, 0, id);
  return rest;
}

export type VisibleTabsInput = {
  /** Candidate tab ids in display order (hidden tabs already removed). */
  ids: TabId[];
  /** Measured width of each tab, keyed by `String(id)`. */
  widths: Record<string, number>;
  /** Width the tabs, the "More" button and the "+" button share. */
  available_width: number;
  /** Width reserved for the "More" button whenever something overflows. */
  more_button_width: number;
  /** Gap between two tabs, in pixels. */
  gap: number;
  /** The tab that must stay on screen. */
  active_id: TabId | null;
};

/**
 * Picks which tabs fit on screen, in display order, monday.com style: as many
 * leading tabs as fit, with the active tab swapped into the last slot when it
 * would otherwise overflow. Returns every id when everything fits or nothing
 * has been measured yet.
 */
export function computeVisibleTabIds(input: VisibleTabsInput): TabId[] {
  const { ids, widths, available_width, more_button_width, gap, active_id } = input;
  const widthOf = (id: TabId) => widths[String(id)] ?? 0;
  if (available_width <= 0 || ids.some((id) => widths[String(id)] === undefined)) return ids;

  const totalOf = (list: TabId[]) => list.reduce<number>((sum, id, index) => sum + widthOf(id) + (index > 0 ? gap : 0), 0);
  if (totalOf(ids) <= available_width) return ids;

  const budget = available_width - more_button_width - gap;
  const visible: TabId[] = [];
  for (const id of ids) {
    if (totalOf([...visible, id]) > budget) break;
    visible.push(id);
  }

  if (active_id !== null && ids.includes(active_id) && !visible.includes(active_id)) {
    // Make room for the active tab by dropping trailing tabs until it fits.
    while (visible.length > 0 && totalOf([...visible, active_id]) > budget) visible.pop();
    visible.push(active_id);
  }

  // Always keep at least one tab on screen, even if it has to be truncated.
  if (visible.length === 0 && ids.length > 0) visible.push(active_id ?? ids[0]);
  return visible;
}
