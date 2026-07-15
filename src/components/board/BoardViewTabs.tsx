"use client";
import React from "react";
import { ChevronDownIcon, MoreDotsIcon, PlusIcon } from "@/icons/workspace-icons";
import { TableViewIcon } from "@/icons/board-icons";

export type BoardViewTabsProps = {
  /** Label of the primary (active) table view. */
  primary_label: string;
  /** Secondary view names shown after the primary view. */
  views: string[];
};

/**
 * The row of board views ("Main table", team names, …). The primary view is
 * always active in this static design; secondary views are display-only.
 */
const BoardViewTabs: React.FC<BoardViewTabsProps> = ({ primary_label, views }) => (
  <div className="flex items-center gap-0.5 border-b border-shell-border">
    <span className="-mb-px mr-3.5 flex cursor-pointer items-center gap-2 border-b-2 border-brand-500 px-1 py-[9px] text-[13.5px] font-semibold text-shell-text">
      <span className="text-[#00c875]">
        <TableViewIcon />
      </span>
      {primary_label}
      <span className="text-shell-text-muted">
        <MoreDotsIcon size={12} />
      </span>
    </span>

    {views.map((view, index) => (
      <span
        key={`${view}-${index}`}
        className="cursor-pointer whitespace-nowrap px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
      >
        {view}
      </span>
    ))}

    <span className="flex cursor-pointer items-center gap-1.5 px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text">
      All
      <ChevronDownIcon size={11} />
    </span>

    <button
      type="button"
      className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
      aria-label="Add view"
    >
      <PlusIcon size={15} />
    </button>
  </div>
);

export default BoardViewTabs;
