import TreeBar from "./TreeBar";
import TreeHook from "./TreeHook";
import { stickyCellStyle, useStickyColumns } from "../stickyColumns";

interface AddSubitemRowProps {
  min_width: number;
  color: string;
  tint: string;
  onAdd: () => void;
}

export default function AddSubitemRow({ min_width, color, tint, onAdd }: AddSubitemRowProps) {
  const is_sticky_columns = useStickyColumns();
  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <TreeBar variant="faded" color={color} tint={tint} />
      <TreeHook color={tint} ghost />
      <div className="w-[5px] flex-none rounded-bl-[5px]" style={{ background: tint }} />
      <div className="grid flex-1 grid-cols-[34px_1fr] rounded-br-[10px] border-r border-b border-boardtree-border bg-boardtree-surface">
        <div className="flex h-9 items-center justify-center border-r border-boardtree-grid" style={{ ...stickyCellStyle(is_sticky_columns, 0), zIndex: 15, background: "var(--color-boardtree-surface)" }}>
          <span className="h-4 w-4 rounded-[4px] border border-boardtree-control-border bg-boardtree-surface" />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 items-center pr-3 pl-5 text-board-cell text-boardtree-text-secondary hover:text-boardtree-accent"
          style={{ ...stickyCellStyle(is_sticky_columns, 34), zIndex: 15 }}
        >
          + Add subitem
        </button>
      </div>
    </div>
  );
}
