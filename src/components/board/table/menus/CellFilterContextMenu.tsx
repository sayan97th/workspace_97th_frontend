"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FilterIcon } from "@/icons/board-icons";

export type CellFilterContextMenuTarget = {
  x: number;
  y: number;
  item_id: string;
  column_id: string;
};

export type CellFilterContextMenuProps = {
  target: CellFilterContextMenuTarget;
  onFilter: (exclude: boolean) => void;
  onClose: () => void;
};

const MENU_WIDTH = 216;
const VIEWPORT_MARGIN = 8;

/**
 * The menu a right click on a table cell opens: "Filter by this value" adds
 * an Advanced filters rule matching the cell's value, "Exclude this value"
 * adds the opposite rule. Portaled and fixed at the pointer, clamped to the
 * viewport, and dismissed by an outside click, Escape or any scroll.
 */
function CellFilterContextMenu({ target, onFilter, onClose }: CellFilterContextMenuProps) {
  const menu_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: target.y, left: target.x });

  useLayoutEffect(() => {
    const height = menu_ref.current?.offsetHeight ?? 0;
    setPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(target.x, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(target.y, window.innerHeight - height - VIEWPORT_MARGIN)),
    });
  }, [target.x, target.y]);

  useLayoutEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menu_ref.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const item_class =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-boardtree-text hover:bg-boardtree-hover";

  return createPortal(
    <div
      ref={menu_ref}
      role="menu"
      className="fixed z-[1000] rounded-xl border border-boardtree-border-soft bg-boardtree-surface p-1.5 shadow-2xl shadow-black/40"
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className={item_class}
        onClick={() => {
          onFilter(false);
          onClose();
        }}
      >
        <span className="flex flex-none text-boardtree-text-muted">
          <FilterIcon />
        </span>
        Filter by this value
      </button>
      <button
        type="button"
        role="menuitem"
        className={item_class}
        onClick={() => {
          onFilter(true);
          onClose();
        }}
      >
        <span className="flex flex-none text-boardtree-text-muted">
          <FilterIcon />
        </span>
        Exclude this value
      </button>
    </div>,
    document.body
  );
}

export default CellFilterContextMenu;
