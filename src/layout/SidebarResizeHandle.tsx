"use client";

import { useCallback, useRef, useState } from "react";
import { clampSidebarWidth } from "./sidebarConstants";

interface SidebarResizeHandleProps {
  width: number;
  /** Fired on every pointer move while dragging, local-only preview, no persistence. */
  onResize: (width: number) => void;
  /** Fired once on drag end with the final width, this is the one that should persist. */
  onResizeEnd: (width: number) => void;
}

/**
 * Drag handle on the workspace sidebar's right edge, hover/drag it to resize
 * the sidebar, mirroring the board table's own `ColumnResizeHandle`. Uses
 * Pointer Events + `setPointerCapture` so the drag keeps tracking the cursor
 * even once it leaves the handle's thin hit area, with no window-level
 * listeners to attach or clean up.
 */
export default function SidebarResizeHandle({ width, onResize, onResizeEnd }: SidebarResizeHandleProps) {
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
    return clampSidebarWidth(drag_start.start_width + delta);
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
      aria-label="Resize sidebar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="group absolute -right-[3px] top-0 z-[60] hidden h-full w-[6px] cursor-col-resize touch-none select-none lg:block"
    >
      <div className={`mx-auto h-full w-[2px] bg-transparent group-hover:bg-brand-500 ${is_active ? "bg-brand-500" : ""}`} />
    </div>
  );
}
