import StatusMenu from "./StatusMenu";
import type { TableBoardOption } from "./types";

interface StatusCellProps {
  value: string;
  options: TableBoardOption[];
  is_menu_open: boolean;
  text_size_class: string;
  onOpenMenu: () => void;
  onPickStatus: (option_id: string | null) => void;
  onCloseMenu: () => void;
  menu_top_offset_px: number;
}

/** Empty-status pill treatment — mirrors the design's own `""` status entry (a blank grey pill), used whenever `value` doesn't resolve to a real option. */
const EMPTY_COLOR = "#c9ccd4";

const StatusCell = ({ value, options, is_menu_open, text_size_class, onOpenMenu, onPickStatus, onCloseMenu, menu_top_offset_px }: StatusCellProps) => {
  const option = options.find((candidate) => candidate.id === value) ?? null;

  return (
    <div className="relative flex h-full items-stretch">
      <button
        type="button"
        onClick={onOpenMenu}
        className={`flex flex-1 items-center justify-center font-medium ${text_size_class}`}
        style={{ background: option?.color ?? EMPTY_COLOR, color: "#ffffff" }}
      >
        {option?.label ?? ""}
      </button>
      {is_menu_open && <StatusMenu options={options} onPickStatus={onPickStatus} onClose={onCloseMenu} top_offset_px={menu_top_offset_px} />}
    </div>
  );
};

export default StatusCell;
