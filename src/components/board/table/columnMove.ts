import type React from "react";
import type { ColumnDragSide, ColumnScope } from "./useBoardTable";

/**
 * The `data-column-move` value every cell of one column carries (header,
 * item/subitem cells, summaries, skeletons). `ColumnMoveAnimator` slides all
 * cells sharing a key together, so a cell without it snaps instead of sliding.
 */
export function columnMoveKey(scope: ColumnScope, column_id: string): string {
  return `${scope}:${column_id}`;
}

/** Joined column order of every group and scope, used to tell when a render actually reordered columns. */
export function columnOrderKey(groups: Array<{ key: string; base_columns: { id: string }[]; custom_columns: { id: string }[]; sub_base_columns: { id: string }[]; sub_custom_columns: { id: string }[] }>): string {
  return groups
    .map((group) => [
      group.key,
      group.base_columns.concat(group.custom_columns).map((c) => c.id).join(","),
      group.sub_base_columns.concat(group.sub_custom_columns).map((c) => c.id).join(","),
    ].join("|"))
    .join(";");
}

/** Padding around the ghost card, `$ghost-padding` in `column-move.scss`. */
const GHOST_PADDING = 12;

/**
 * Replaces the browser's default drag snapshot with a lifted copy of the
 * header cell (`.column-move-ghost` in `column-move.scss`). The copy is
 * mounted inside the table's theme root so its color tokens resolve, kept
 * off screen, and removed once the browser has taken its snapshot.
 */
export function setColumnDragImage(event: React.DragEvent<HTMLElement>, label: string) {
  const source = event.currentTarget;
  const data_transfer = event.dataTransfer;
  data_transfer.effectAllowed = "move";
  // Firefox does not start a drag without some payload.
  data_transfer.setData("text/plain", label);

  const rect = source.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "column-move-ghost";
  const card = document.createElement("div");
  card.className = "column-move-ghost__card";
  card.style.width = `${Math.round(rect.width)}px`;
  card.style.height = `${Math.round(rect.height)}px`;
  const ghost_label = document.createElement("span");
  ghost_label.className = "column-move-ghost__label";
  ghost_label.textContent = label;
  card.appendChild(ghost_label);
  ghost.appendChild(card);

  const theme_root = source.closest(".board-table-theme") ?? document.body;
  theme_root.appendChild(ghost);
  const offset_x = GHOST_PADDING + Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
  const offset_y = GHOST_PADDING + Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  data_transfer.setDragImage(ghost, offset_x, offset_y);
  window.setTimeout(() => ghost.remove(), 0);
}

/** Which half of the hovered header the pointer is over, for the midpoint swap rule in `onColumnDragOver`. */
export function columnDragSide(event: React.DragEvent<HTMLElement>): ColumnDragSide {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}
