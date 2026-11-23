import type React from "react";
import { ROW_DRAG_END_EVENT, ROW_DRAG_MIME } from "./rowDragUtils";

interface RowDragImageOptions {
  /** The row's id, carried in the drag data. */
  node_id: string;
  name: string;
  /** The row's group color, used for the card's side bar and border. */
  color: string;
  /** Small secondary line, like "3 subitems". Omitted when empty. */
  meta?: string;
}

/**
 * Starts a row drag: sets the drag data (Firefox only starts a native drag
 * once some is set), relays the source node's own `dragend` (see
 * `ROW_DRAG_END_EVENT`) and swaps the browser's default snapshot of the whole row
 * for a compact, slightly tilted card with the row's name, like monday.com.
 * The card is built off screen, handed to `setDragImage`, then removed right
 * after the browser has taken its picture. Styled in `row-move.scss`.
 */
export function startRowDrag(event: React.DragEvent<HTMLElement>, { node_id, name, color, meta }: RowDragImageOptions) {
  const data_transfer = event.dataTransfer;
  data_transfer.effectAllowed = "move";
  data_transfer.setData(ROW_DRAG_MIME, node_id);
  event.currentTarget.addEventListener("dragend", () => window.dispatchEvent(new Event(ROW_DRAG_END_EVENT)), { once: true });

  const card = document.createElement("div");
  card.className = "row-drag-card";
  card.style.setProperty("--row-group-color", color);

  const body = document.createElement("div");
  body.className = "row-drag-card__body";

  const bar = document.createElement("span");
  bar.className = "row-drag-card__bar";

  const grip = document.createElement("span");
  grip.className = "row-drag-card__grip";
  grip.innerHTML =
    '<svg viewBox="0 0 10 16" width="8" height="14" aria-hidden="true">' +
    [3, 8, 13].map((y) => `<circle cx="2.5" cy="${y}" r="1.4"/><circle cx="7.5" cy="${y}" r="1.4"/>`).join("") +
    "</svg>";

  const label = document.createElement("span");
  label.className = "row-drag-card__label";
  label.textContent = name.trim() || "Untitled";

  body.append(bar, grip, label);
  if (meta) {
    const chip = document.createElement("span");
    chip.className = "row-drag-card__meta";
    chip.textContent = meta;
    body.append(chip);
  }
  card.append(body);
  // Inside the board's theme root, so the card picks up the board font and theme tokens.
  const theme_root = event.currentTarget.closest(".board-table-theme") ?? document.body;
  theme_root.append(card);

  try {
    data_transfer.setDragImage(card, 22, 26);
  } catch {
    // Older browsers without `setDragImage` keep their own snapshot.
  }
  window.setTimeout(() => card.remove(), 0);
}
