import type { BoardItemDto } from "@/types/board-content";

/**
 * Puts the root rows an automation changed back into the board's `items`. The table renders a
 * group's rows in array order, so a row that stayed where it was is replaced in place, while a
 * row that moved (another group, another position) is taken out and put back in front of the
 * first row of its group with a higher position, or after the group's last row. Rows in
 * `gone_ids` were archived, deleted or moved away and are dropped.
 */
export function placeAutomationRows(current: BoardItemDto[], fetched: BoardItemDto[], gone_ids: Set<number>): BoardItemDto[] {
  const current_by_id = new Map(current.map((row) => [row.id, row]));
  const in_place = new Map<number, BoardItemDto>();
  const relocated: BoardItemDto[] = [];

  fetched.forEach((row) => {
    const existing = current_by_id.get(row.id);
    if (existing && existing.group_id === row.group_id && existing.position === row.position) {
      in_place.set(row.id, row);
    } else {
      relocated.push(row);
    }
  });

  const relocated_ids = new Set(relocated.map((row) => row.id));
  let next = current
    .filter((row) => !gone_ids.has(row.id) && !relocated_ids.has(row.id))
    .map((row) => in_place.get(row.id) ?? row);

  [...relocated]
    .sort((a, b) => a.position - b.position)
    .forEach((row) => {
      next = insertByPosition(next, row);
    });

  return next;
}

function insertByPosition(rows: BoardItemDto[], row: BoardItemDto): BoardItemDto[] {
  let last_in_group = -1;
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].group_id !== row.group_id) continue;
    if (rows[index].position > row.position) {
      return [...rows.slice(0, index), row, ...rows.slice(index)];
    }
    last_in_group = index;
  }
  if (last_in_group === -1) return [...rows, row];
  return [...rows.slice(0, last_in_group + 1), row, ...rows.slice(last_in_group + 1)];
}

const FLASH_CLASS = "automation-row-flash";
const FLASH_MS = 1700;

/**
 * Makes the cells of the given rows glow once (see `automation-activity.scss`), so the eye finds
 * what the automation changed. Waits a frame or two for the reloaded rows to render first.
 */
export function flashAutomationRows(item_ids: number[]): void {
  if (typeof window === "undefined" || item_ids.length === 0) return;
  window.setTimeout(() => {
    const selector = item_ids.map((id) => `[data-filter-cell="true"][data-item-id="${id}"]`).join(",");
    const cells = Array.from(document.querySelectorAll<HTMLElement>(selector));
    cells.forEach((cell) => {
      cell.classList.remove(FLASH_CLASS);
      // Restarts the animation when the same row flashes twice in a row.
      void cell.offsetWidth;
      cell.classList.add(FLASH_CLASS);
    });
    window.setTimeout(() => cells.forEach((cell) => cell.classList.remove(FLASH_CLASS)), FLASH_MS);
  }, 80);
}
