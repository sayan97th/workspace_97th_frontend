import DateMenu from "./DateMenu";

interface DateCellProps {
  value: string;
  is_menu_open: boolean;
  text_size_class: string;
  border_color: string;
  onOpenMenu: () => void;
  onPickDate: (date_string: string) => void;
  onCloseMenu: () => void;
  menu_top_offset_px: number;
}

const DateCell = ({
  value,
  is_menu_open,
  text_size_class,
  border_color,
  onOpenMenu,
  onPickDate,
  onCloseMenu,
  menu_top_offset_px,
}: DateCellProps) => (
  <div className="relative flex h-full items-stretch border-r" style={{ borderColor: border_color }}>
    <button
      type="button"
      onClick={onOpenMenu}
      className={`flex flex-1 items-center justify-center ${text_size_class} text-[#4a5068] hover:bg-[#f4f6fb]`}
    >
      {value || "—"}
    </button>
    {is_menu_open && (
      <DateMenu value={value} onPickDate={onPickDate} onClose={onCloseMenu} top_offset_px={menu_top_offset_px} />
    )}
  </div>
);

export default DateCell;
