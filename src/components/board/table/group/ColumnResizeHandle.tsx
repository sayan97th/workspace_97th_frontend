"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "../constants";

interface ColumnResizeHandleProps {
  width: number;
  /** Fired on every pointer move while dragging — local-only preview, no persistence. */
  onResize: (width: number) => void;
  /** Fired once on drag end with the final width — this is the one that should persist. */
  onResizeEnd: (width: number) => void;
}

/**
 * Drag handle on a column header's right edge — hover/drag it to resize the
 * column, Monday-style. Uses Pointer Events + `setPointerCapture` so the drag
 * keeps tracking the cursor even once it leaves the handle's thin hit area,
 * with no window-level listeners to attach or clean up.
 */
export default function ColumnResizeHandle({ width, onResize, onResizeEnd }: ColumnResizeHandleProps) {
  const [is_active, setIsActive] = useState(false);
  const drag_start_ref = useRef<{ pointer_x: number; start_width: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      drag_start_ref.current = { pointer_x: e.clientX, start_width: width };
      setIsActive(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  const widthFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag_start = drag_start_ref.current;
    if (!drag_start) return null;
    const delta = e.clientX - drag_start.pointer_x;
    return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(drag_start.start_width + delta)));
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const next_width = widthFromEvent(e);
      if (next_width != null) onResize(next_width);
    },
    [onResize]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const final_width = widthFromEvent(e);
      drag_start_ref.current = null;
      setIsActive(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (final_width != null) onResizeEnd(final_width);
    },
    [onResizeEnd]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="group absolute -right-[3px] top-0 z-[95] h-full w-[6px] cursor-col-resize touch-none select-none"
    >
      <div
        className="mx-auto h-full w-[2px] bg-transparent group-hover:bg-boardtree-accent"
        style={is_active ? { background: "var(--color-boardtree-accent)" } : undefined}
      />
      <span
        className={`pointer-events-none absolute -top-8 left-1/2 z-[96] -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-[#323338] px-2 py-1 text-[11px] font-medium text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-opacity ${
          is_active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        Resize column
      </span>
    </div>
  );
}
