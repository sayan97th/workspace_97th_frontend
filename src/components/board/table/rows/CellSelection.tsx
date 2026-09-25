"use client";

import type React from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { cellKey } from "../cellRange";

/** How one data cell takes part in the table's selection, see `useBoardTable`'s derived `selected_cell_keys`. */
export interface CellSelectionFlags {
  is_active: boolean;
  /** Inside a multi cell selection (the active cell included). */
  is_selected: boolean;
  is_fill_target: boolean;
  has_fill_handle: boolean;
}

export function cellSelectionFlags(state: BoardTableState, node_id: string, column_id: string): CellSelectionFlags {
  const key = cellKey(node_id, column_id);
  return {
    is_active: state.active_cell?.node_id === node_id && state.active_cell?.column_id === column_id,
    is_selected: state.selected_cell_keys.size > 1 && state.selected_cell_keys.has(key),
    is_fill_target: state.fill_target_keys.has(key),
    has_fill_handle: !state.read_only && state.fill_handle_cell?.node_id === node_id && state.fill_handle_cell?.column_id === column_id,
  };
}

/**
 * Mouse handlers every data cell shares: mouse down selects the cell (Shift
 * extends the selection and must not open the cell's own menu), moving over
 * a cell grows a range or fill drag.
 */
export function cellPointerHandlers(actions: BoardTableActions, node_id: string, column_id: string) {
  return {
    onMouseDown: (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      // Shift+click extends the selection, so it must not focus a text cell or start a text selection.
      if (event.shiftKey) event.preventDefault();
      actions.pointerDownCell(node_id, column_id, event.shiftKey);
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (!event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
    },
    onMouseEnter: () => actions.pointerEnterCell(node_id, column_id),
  };
}

/** The light blue wash over selected cells, drawn above the cell's own content so it also shows on colored Status pills. */
export function SelectionTint() {
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-[4] bg-boardtree-accent/10" />;
}

/**
 * The small square at the selection's bottom right corner. Dragging it fills
 * the rows it passes over, a double click fills down to the end of the group.
 */
export function FillHandle({ onStart, onDoubleClick }: { onStart: () => void; onDoubleClick: () => void }) {
  return (
    <div
      data-fill-handle="true"
      draggable={false}
      title="Drag to fill, double click to fill down to the end of the group"
      onMouseDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onStart();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick();
      }}
      className="absolute -bottom-[4px] -right-[4px] z-10 h-[9px] w-[9px] cursor-crosshair rounded-[1.5px] border border-white bg-boardtree-accent"
    />
  );
}
