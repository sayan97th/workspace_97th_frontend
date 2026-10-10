interface AddItemRowProps {
  min_width: number;
  color: string;
  onAdd: () => void;
}

/** Footer row shown at the bottom of a group's item list, mirroring AddSubitemRow but scoped
 *  to the main item tree (no TreeHook/tint, since top-level items don't sit inside a sub-tree). */
export default function AddItemRow({ min_width, color, onAdd }: AddItemRowProps) {
  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      {/* The group color fades on this last row and rounds off, closing the table like monday.com does. */}
      <div className="w-[5px] flex-none rounded-bl-[4px]" style={{ background: color, opacity: 0.5 }} />
      <div className="grid flex-1 grid-cols-[36px_1fr] border-b border-boardtree-grid bg-boardtree-surface">
        <div className="flex h-9 items-center justify-center border-r border-boardtree-grid" style={{ position: "sticky", left: 0, zIndex: 15, background: "var(--color-boardtree-surface)" }}>
          <span className="h-4 w-4 rounded-[4px] border border-boardtree-control-border bg-boardtree-surface opacity-50" />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 items-center pr-3 pl-10 text-board-cell text-boardtree-text-secondary hover:text-boardtree-accent"
          style={{ position: "sticky", left: 36, zIndex: 15 }}
        >
          + Add item
        </button>
      </div>
    </div>
  );
}
