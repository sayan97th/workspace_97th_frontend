import React from "react";
import { FileIcon } from "@/icons/workspace-icons";
import {
  BoardTypeIcon,
  ColumnTypeIcon,
  DashboardTypeIcon,
  GroupTypeIcon,
  ItemTypeIcon,
  SubitemTypeIcon,
} from "@/icons/trash-icons";
import type { TrashItemType } from "./types";

export const TRASH_TYPE_META: Record<TrashItemType, { label: string; Icon: React.FC<{ className?: string; size?: number }> }> = {
  item: { label: "Item", Icon: ItemTypeIcon },
  subitem: { label: "Subitem", Icon: SubitemTypeIcon },
  column: { label: "Column", Icon: ColumnTypeIcon },
  group: { label: "Group", Icon: GroupTypeIcon },
  doc: { label: "Doc", Icon: FileIcon },
  dashboard: { label: "Dashboard", Icon: DashboardTypeIcon },
  board: { label: "Board", Icon: BoardTypeIcon },
};

export type TrashTypeBadgeProps = {
  type: TrashItemType;
  size?: number;
};

/** Icon + label pair for a {@link TrashItemType}, shared by the trash table's Type column and the type filter popover. */
const TrashTypeBadge: React.FC<TrashTypeBadgeProps> = ({ type, size = 13 }) => {
  const { label, Icon } = TRASH_TYPE_META[type];
  return (
    <span className="flex items-center gap-[7px] text-[12.5px] text-[#b4bcbd]">
      <span className="flex flex-none text-[#8a9495]">
        <Icon size={size} />
      </span>
      {label}
    </span>
  );
};

export default TrashTypeBadge;
