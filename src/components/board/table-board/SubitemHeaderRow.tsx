import RailBar from "./RailBar";

interface SubitemHeaderRowProps {
  group_color: string;
  name_column_width_px: number;
}

const SubitemHeaderRow = ({ group_color, name_column_width_px }: SubitemHeaderRowProps) => (
  <div className="flex min-w-[1020px] items-stretch">
    <RailBar variant="solid" color={group_color} />
    <div className="w-[30px] flex-none" />
    <div className="mt-2 w-[5px] flex-none rounded-tl-[5px]" style={{ background: group_color }} />
    <div
      className="mt-2 grid rounded-tr-[10px] border border-b-0 border-l-0 border-[#dfe3ef] bg-[#f7f8fc]"
      style={{ gridTemplateColumns: `34px ${name_column_width_px}px 52px 108px 156px 148px 44px 1fr` }}
    >
      <div className="h-9 border-r border-[#e7eaf3]" />
      <div className="flex h-9 items-center justify-center text-xs font-semibold text-[#5b6180]">Subitem</div>
      <div className="h-9 border-r border-[#e7eaf3]" />
      <div className="flex h-9 items-center justify-center border-r border-[#e7eaf3] text-xs font-medium text-[#6b7189]">Owner</div>
      <div className="flex h-9 items-center justify-center border-r border-[#e7eaf3] text-xs font-medium text-[#6b7189]">Status</div>
      <div className="flex h-9 items-center justify-center border-r border-[#e7eaf3] text-xs font-medium text-[#6b7189]">Date</div>
      <div className="flex h-9 items-center justify-center text-[15px] text-[#a4aac2]">+</div>
      <div className="h-9" />
    </div>
  </div>
);

export default SubitemHeaderRow;
