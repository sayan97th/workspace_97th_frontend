"use client";
import React from "react";
import {
  ChevronDownIcon,
  MoreDotsIcon,
  PersonIcon,
  SearchIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import {
  CollapseTableIcon,
  FilterIcon,
  GroupByIcon,
  HideIcon,
  SortIcon,
} from "@/icons/board-icons";

export type BoardToolbarItem = {
  id: string;
  label: string;
  Icon: IconComponent;
};

/** Default Monday-style toolbar actions used by the Client Hub board. */
export const DEFAULT_TOOLBAR_ITEMS: BoardToolbarItem[] = [
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "person", label: "Person", Icon: PersonIcon },
  { id: "filter", label: "Filter", Icon: FilterIcon },
  { id: "sort", label: "Sort", Icon: SortIcon },
  { id: "hide", label: "Hide", Icon: HideIcon },
  { id: "group", label: "Group by", Icon: GroupByIcon },
];

export type BoardToolbarProps = {
  new_item_label?: string;
  items?: BoardToolbarItem[];
};

/** Board toolbar: the red "New item" split button plus filter/sort actions. */
const BoardToolbar: React.FC<BoardToolbarProps> = ({
  new_item_label = "New item",
  items = DEFAULT_TOOLBAR_ITEMS,
}) => (
  <div className="flex items-center gap-1">
    <div className="mr-2 flex items-center overflow-hidden rounded-lg bg-brand-500">
      <button type="button" className="px-3.5 py-2 text-[13px] font-semibold text-white">
        {new_item_label}
      </button>
      <button
        type="button"
        className="flex items-center border-l border-white/25 py-2 pl-2 pr-2 text-white"
        aria-label="New item options"
      >
        <ChevronDownIcon size={11} />
      </button>
    </div>

    {items.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        className="flex items-center gap-[7px] rounded-lg px-[11px] py-2 text-[13px] font-medium text-[#c7d0d0] transition-colors hover:bg-white/[0.07]"
      >
        <Icon />
        {label}
      </button>
    ))}

    <button
      type="button"
      className="flex items-center rounded-lg px-2.5 py-2 text-[#c7d0d0] transition-colors hover:bg-white/[0.07]"
      aria-label="More toolbar actions"
    >
      <MoreDotsIcon />
    </button>

    <div className="flex-1" />

    <button
      type="button"
      className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#8a9495] transition-colors hover:bg-white/[0.07]"
      aria-label="Collapse all groups"
    >
      <CollapseTableIcon />
    </button>
  </div>
);

export default BoardToolbar;
