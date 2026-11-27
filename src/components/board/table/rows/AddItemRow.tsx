import type { CSSProperties } from "react";
import { stickyCellStyle, useStickyColumns } from "../stickyColumns";

interface AddItemRowProps {
  min_width: number;
  color: string;
  onAdd: () => void;
}

/** Footer row shown at the bottom of a group's item list, mirroring AddSubitemRow but scoped
 *  to the main item tree (no TreeHook/tint, since top-level items don't sit inside a sub-tree). */
export default function AddItemRow({ min_width, color, onAdd }: AddItemRowProps) {
  const is_sticky_columns = useStickyColumns();
  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none" />
      <div className="add-item-row grid flex-1 grid-cols-[36px_max-content_1fr] border-b border-boardtree-grid bg-boardtree-surface" style={{ "--add-item-color": color } as CSSProperties}>
        <div className="h-9" style={{ ...stickyCellStyle(is_sticky_columns, 0), zIndex: 15, background: "var(--color-boardtree-surface)" }} />
        <button
          type="button"
          onClick={onAdd}
          className="add-item-row__button flex h-9 items-center pr-3 pl-[27px] text-board-cell text-boardtree-text-faint"
          style={{ ...stickyCellStyle(is_sticky_columns, 36), zIndex: 15, background: "var(--color-boardtree-surface)" }}
        >
          Add item...
        </button>
        {/* Filler track: the button only takes its own width, so it has room to stay frozen while the row scrolls. */}
        <div aria-hidden />
      </div>
    </div>
  );
}
