// Bulk cell edit, monday.com style: when a cell is changed on a row that is
// checked together with other rows, the change lands on every checked row.
// List cells (People, Dropdown, Tags, Connect boards) take the entries that
// were added or removed, so each row keeps what it already had. Every other
// editable column copies the new value. Pure helpers, the persistence lives in
// `TableBoardView` (`handleTableCellValueChange`).

import type { BoardColumnKind } from "../columnTypes";

/** Cells whose value is a list of ids, merged entry by entry across the checked rows. */
const LIST_KINDS: ReadonlySet<BoardColumnKind> = new Set(["people", "dropdown", "tags", "connect_board"]);

/** Cells that copy the edited value to every checked row. */
const COPY_KINDS: ReadonlySet<BoardColumnKind> = new Set([
  "text",
  "long_text",
  "number",
  "status",
  "label",
  "date",
  "timeline",
  "progress",
  "checkbox",
  "phone",
  "email",
  "rating",
  "link",
  "world_clock",
  "location",
  "week",
  "country",
  "color_picker",
  "hour",
]);

/**
 * Columns left out on purpose: per person (Vote), per row history (Files,
 * Time tracking, Checklist, Doc), computed or read only (Formula, Mirror,
 * Item ID, Creation log, Last updated, Progress tracking), actions (Button)
 * and Dependency, whose links are saved through their own endpoint.
 */
export function isBulkEditableKind(kind: BoardColumnKind | undefined): boolean {
  return !!kind && (LIST_KINDS.has(kind) || COPY_KINDS.has(kind));
}

export function isListValue(value: unknown): value is unknown[] | null | undefined {
  return value === null || value === undefined || Array.isArray(value);
}

/** Whether this column's bulk edit merges entries, only when both values are lists (a single select Dropdown is copied). */
export function isMergeEdit(kind: BoardColumnKind | undefined, previous_value: unknown, next_value: unknown): boolean {
  return !!kind && LIST_KINDS.has(kind) && isListValue(previous_value) && isListValue(next_value);
}

const toKey = (entry: unknown) => String(entry);

/** Entries `next` gained and lost compared with `previous`, ids compared as strings since stored lists mix "12" and 12. */
export function diffListValue(previous_value: unknown, next_value: unknown): { added: unknown[]; removed: unknown[] } {
  const previous_list = Array.isArray(previous_value) ? previous_value : [];
  const next_list = Array.isArray(next_value) ? next_value : [];
  const previous_keys = new Set(previous_list.map(toKey));
  const next_keys = new Set(next_list.map(toKey));
  return {
    added: next_list.filter((entry) => !previous_keys.has(toKey(entry))),
    removed: previous_list.filter((entry) => !next_keys.has(toKey(entry))),
  };
}

/** One row's list after a merge, same rules as the API's `mergeListValue`: drop `removed`, append missing `added`, empty means null. */
export function mergeListValue(current_value: unknown, added: unknown[], removed: unknown[]): unknown[] | null {
  const removed_keys = new Set(removed.map(toKey));
  const next = (Array.isArray(current_value) ? current_value : []).filter((entry) => !removed_keys.has(toKey(entry)));
  const next_keys = new Set(next.map(toKey));
  for (const entry of added) {
    if (next_keys.has(toKey(entry))) continue;
    next.push(entry);
    next_keys.add(toKey(entry));
  }
  return next.length ? next : null;
}

/** The checked rows a change on `item_id` spreads to, or null when it stays a single cell edit. */
export function bulkTargetIds(item_id: number, selected_ids: number[], canEdit: (id: number) => boolean = () => true): number[] | null {
  if (selected_ids.length < 2 || !selected_ids.includes(item_id)) return null;
  const target_ids = selected_ids.filter((id) => id === item_id || canEdit(id));
  return target_ids.length > 1 ? target_ids : null;
}

const FLASH_CLASS = "bulk-cell-flash";
/** Matches the glow in `bulk-cell-edit.scss`, plus a little room. */
const FLASH_DURATION_MS = 1000;
const flash_timers = new WeakMap<HTMLElement, number>();

/**
 * Briefly lights up the edited column on every checked row, so it is clear the change went to all of them.
 * Cells are found through the `data-item-id`/`data-column-id` both `ItemRow` and `SubitemRow` put on them.
 */
export function flashBulkCells(item_ids: number[], column_id: string): void {
  if (typeof document === "undefined") return;
  window.requestAnimationFrame(() => {
    for (const item_id of item_ids) {
      const cells = document.querySelectorAll<HTMLElement>(`[data-item-id="${item_id}"][data-column-id="${CSS.escape(column_id)}"]`);
      cells.forEach((cell) => {
        cell.classList.remove(FLASH_CLASS);
        // Reading layout restarts the animation when the same cell is flashed again (one per People pick).
        void cell.offsetWidth;
        cell.classList.add(FLASH_CLASS);
        window.clearTimeout(flash_timers.get(cell));
        flash_timers.set(
          cell,
          window.setTimeout(() => cell.classList.remove(FLASH_CLASS), FLASH_DURATION_MS)
        );
      });
    }
  });
}
