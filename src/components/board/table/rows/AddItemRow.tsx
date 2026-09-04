import TreeBar from "./TreeBar";

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
      <TreeBar variant="thick" color={color} />
      <div className="grid flex-1 grid-cols-[36px_1fr] border-b border-boardtree-border-soft bg-boardtree-surface">
        <div className="flex h-[42px] items-center justify-center border-r border-boardtree-border-soft">
          <span className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-boardtree-border bg-boardtree-surface" />
        </div>
        <button type="button" onClick={onAdd} className="flex h-[42px] items-center pr-3 pl-5 text-[13px] text-boardtree-text-muted hover:text-boardtree-accent">
          + Add item
        </button>
      </div>
    </div>
  );
}
