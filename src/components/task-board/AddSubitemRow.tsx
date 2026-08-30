import TreeConnector from "./TreeConnector";

interface AddSubitemRowProps {
  onAddSubitem: () => void;
}

const AddSubitemRow = ({ onAddSubitem }: AddSubitemRowProps) => (
  <div className="flex min-w-[1020px] items-stretch">
    <TreeConnector line_color="#c3cef9" height_px={20} />
    <div className="w-[5px] flex-none rounded-bl-[5px] bg-[#c3cef9]" />
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

export default AddSubitemRow;
