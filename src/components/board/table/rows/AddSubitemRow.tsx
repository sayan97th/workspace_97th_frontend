import TreeBar from "./TreeBar";
import TreeHook from "./TreeHook";

interface AddSubitemRowProps {
  min_width: number;
  color: string;
  tint: string;
  onAdd: () => void;
}

export default function AddSubitemRow({ min_width, color, tint, onAdd }: AddSubitemRowProps) {
  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <TreeBar variant="faded" color={color} tint={tint} />
      <TreeHook color={tint} ghost />
      <div className="w-[5px] flex-none rounded-bl-[5px]" style={{ background: tint }} />
      <div className="grid flex-1 grid-cols-[34px_1fr] rounded-br-[10px] border-r border-b border-boardtree-border bg-boardtree-surface">
        <div className="flex h-[38px] items-center justify-center border-r border-boardtree-border-soft">
          <span className="h-[14px] w-[14px] rounded-[3px] border-[1.5px] border-boardtree-border bg-boardtree-surface" />
        </div>
        <button type="button" onClick={onAdd} className="flex h-[38px] items-center pr-3 pl-5 text-[12.5px] text-boardtree-text-muted hover:text-boardtree-accent">
          + Add subitem
        </button>
      </div>
    </div>
  );
}
