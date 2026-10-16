import type { ColumnScope } from "./useBoardTable";
import { columnMoveKey } from "./columnMove";

/** Breathing room left between a revealed column and the visible edge it was scrolled against. */
const REVEAL_MARGIN = 24;

/** A requested reveal is dropped once this much time passes without its column showing up (e.g. a subitem column of a collapsed item). */
export const COLUMN_REVEAL_TIMEOUT_MS = 4000;

export interface ColumnRevealRequest {
  group_key: string;
  scope: ColumnScope;
  /** Known once the API resolves the new column. Absent on the local only path, where `prior_column_ids` finds it instead. */
  column_id?: string;
  /** Column ids of `scope` in the group before the add, so the local only path can tell which column is new. */
  prior_column_ids?: string[];
  /** True when the column was appended at the end, which scrolls the table all the way to its right edge (like monday.com). */
  scroll_to_end: boolean;
  requested_at: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function escapeAttributeValue(value: string): string {
  return typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"');
}

/** Closest ancestor that actually scrolls horizontally: `BoardShell`'s wrapper when embedded, `.table-board-scroll` standalone. */
export function horizontalScrollParentOf(node: HTMLElement): HTMLElement | null {
  for (let element = node.parentElement; element; element = element.parentElement) {
    const { overflowX } = getComputedStyle(element);
    if ((overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") && element.scrollWidth > element.clientWidth) return element;
  }
  return null;
}

/** Right edge of the sticky checkbox, Item and pinned cells in the same header row, which cover the scroller's left side. */
function stickyCoverRight(cell: HTMLElement, fallback_left: number): number {
  let cover_right = fallback_left;
  const row = cell.parentElement;
  if (!row) return cover_right;
  for (const sibling of Array.from(row.children)) {
    if (sibling === cell || !(sibling instanceof HTMLElement) || sibling.style.position !== "sticky") continue;
    cover_right = Math.max(cover_right, sibling.getBoundingClientRect().right);
  }
  return cover_right;
}

/** First rendered cell (header first, it comes first in each group) of the column, or null while it is not in the DOM yet. */
export function findColumnCell(root: HTMLElement, scope: ColumnScope, column_id: string): HTMLElement | null {
  const selector = `[data-column-move="${escapeAttributeValue(columnMoveKey(scope, column_id))}"]`;
  for (const cell of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
    if (cell.getBoundingClientRect().width > 0) return cell;
  }
  return null;
}

/**
 * Scrolls the table horizontally so a newly added column is fully in view.
 * Only the horizontal axis moves, the viewer keeps their vertical position.
 * A column appended at the end scrolls the table to its right edge, so the
 * trailing "+" stays in view too. A column wider than the visible area is
 * aligned to its left edge, just past the sticky Item column.
 */
export function revealColumnCell(cell: HTMLElement, scroll_to_end: boolean): void {
  const scroller = horizontalScrollParentOf(cell);
  if (!scroller) return;
  const scroller_rect = scroller.getBoundingClientRect();
  const cell_rect = cell.getBoundingClientRect();
  const visible_left = stickyCoverRight(cell, scroller_rect.left);
  // `clientWidth` leaves out the vertical scrollbar, which would otherwise hide the column's last pixels.
  const visible_right = scroller_rect.left + scroller.clientLeft + scroller.clientWidth;
  const max_scroll_left = scroller.scrollWidth - scroller.clientWidth;

  let delta = 0;
  if (scroll_to_end) delta = max_scroll_left - scroller.scrollLeft;
  else if (cell_rect.right + REVEAL_MARGIN > visible_right) delta = cell_rect.right + REVEAL_MARGIN - visible_right;
  else if (cell_rect.left < visible_left) delta = cell_rect.left - REVEAL_MARGIN - visible_left;
  // Never push the column's own left edge under the sticky columns.
  if (delta > 0) delta = Math.min(delta, cell_rect.left - visible_left);
  if (Math.abs(delta) < 1) return;

  const next_left = Math.max(0, Math.min(max_scroll_left, scroller.scrollLeft + delta));
  scroller.scrollTo({ left: next_left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
