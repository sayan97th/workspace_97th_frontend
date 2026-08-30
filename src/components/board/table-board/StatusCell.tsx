import { getStatusBackground, getStatusForeground } from "./constants";
import StatusMenu from "./StatusMenu";

interface StatusCellProps {
  status: string;
  is_menu_open: boolean;
  text_size_class: string;
  onOpenMenu: () => void;
  onPickStatus: (status: string) => void;
  onCloseMenu: () => void;
  menu_top_offset_px: number;
}

const StatusCell = ({ status, is_menu_open, text_size_class, onOpenMenu, onPickStatus, onCloseMenu, menu_top_offset_px }: StatusCellProps) => (
  <div className="relative flex h-full items-stretch">
    <button
      type="button"
      onClick={onOpenMenu}
      className={`flex flex-1 items-center justify-center font-medium ${text_size_class}`}
      style={{ background: getStatusBackground(status), color: getStatusForeground(status) }}
    >
      {status}
    </button>
    {is_menu_open && <StatusMenu onPickStatus={onPickStatus} onClose={onCloseMenu} top_offset_px={menu_top_offset_px} />}
  </div>
);

export default StatusCell;
