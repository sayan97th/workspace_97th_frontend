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
      <button type="button" onClick={onAdd} className="flex h-9 items-center gap-1.5 pl-2 text-[12.5px] text-[#8b90a6] hover:text-[#4f6bed]">
        <svg viewBox="0 0 14 14" width="12" height="12"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add subitem
      </button>
    </div>
  );
}
