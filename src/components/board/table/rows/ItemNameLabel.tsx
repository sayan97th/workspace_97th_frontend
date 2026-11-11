"use client";

import type { ReactNode } from "react";
import { useCellTooltip } from "../cells/CellTooltip";

/** Bubble modifier for the full item name, styled in `item-name-cell.scss`. */
const NAME_BUBBLE_CLASS = "item-name-tooltip";

interface ItemNameLabelProps {
  /** Plain item name, shown in full inside the hover bubble. */
  name: string;
  /** What the cell renders, usually `name` with search matches highlighted. */
  children: ReactNode;
  /** Layout and clamp classes from the row (`truncate`, `line-clamp-2`, ...). */
  className: string;
  /** A plain click renames the item. */
  onStartEdit: () => void;
}

/**
 * Item or subitem name inside the Item column. When the name is cut off by the
 * ellipsis (or by the line clamp on taller rows), resting the pointer on it shows
 * the full name in the same dark bubble the Files and Link cells use, like
 * monday.com. A name that already fits never shows a bubble.
 */
export default function ItemNameLabel({ name, children, className, onStartEdit }: ItemNameLabelProps) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLSpanElement>(name, {
    only_when_truncated: true,
    bubble_class: NAME_BUBBLE_CLASS,
  });
  // Keyboard focus is not wired, the span is not focusable and the editor owns the keyboard once open.
  const { ref, onMouseEnter, onMouseLeave } = anchor_props;

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        // A press either starts renaming or starts dragging the row, both cover the name, so the bubble steps aside.
        onMouseDown={hide}
        onClick={() => {
          hide();
          onStartEdit();
        }}
        className={className}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
