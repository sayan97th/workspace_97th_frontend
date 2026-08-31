import RailBar from "./RailBar";
import TreeConnector from "./TreeConnector";

interface AddSubitemRowProps {
  group_color: string;
  onAddSubitem: () => void;
  /** Extra width (dynamically-added columns + "+" button) so this row's rounded/bordered box reaches as far right as item rows do — see {@link import("./DynamicColumns").computeDynamicColumnsExtraWidthPx}. */
  extra_width_px?: number;
}

const AddSubitemRow = ({ group_color, onAddSubitem, extra_width_px = 0 }: AddSubitemRowProps) => {
  const faded_color = `color-mix(in srgb, ${group_color} 35%, white)`;
  return (
    <div className="flex min-w-[1020px] items-stretch" style={extra_width_px > 0 ? { minWidth: 1020 + extra_width_px } : undefined}>
      <RailBar variant="faded" color={group_color} />
      <TreeConnector line_color={faded_color} height_px={20} />
      <div className="w-[5px] flex-none rounded-bl-[5px]" style={{ background: faded_color }} />
      <div className="grid flex-1 grid-cols-[34px_1fr] rounded-br-[10px] border-b border-r border-[#dfe3ef] bg-white">
        <div className="flex h-[38px] items-center justify-center border-r border-[#eef0f7]">
          <div className="h-3.5 w-3.5 rounded-[3px] border-[1.5px] border-[#e2e5ee] bg-white" />
        </div>
        <button type="button" onClick={onAddSubitem} className="flex h-[38px] items-center pl-5 pr-3 text-left text-[12.5px] text-[#8b90a6] hover:text-[#4f6bed]">
          + Add subitem
        </button>
      </div>
    </div>
  );
};

export default AddSubitemRow;
