"use client";
import React from "react";
import { ChevronDownIcon, MoreDotsIcon, PlusIcon } from "@/icons/workspace-icons";
import { TableViewIcon } from "@/icons/board-icons";

/** One clickable tab in the interactive tab bar (see {@link BoardViewTabsProps}). */
export type BoardViewTabItem = {
  id: number | string;
  label: string;
};

export type BoardViewTabsProps =
  | {
      /** Label of the primary (always-active) table view. */
      primary_label: string;
      /** Secondary view names shown after the primary view. */
      views: string[];
    }
  | {
      /**
       * Full tab list (including the primary tab), each addressable by id —
       * used by `TableBoardView` to drive `/boards/{id}/views/{view_id}`
       * navigation. Clicking a tab (or "+") is the caller's responsibility.
       */
      tabs: BoardViewTabItem[];
      active_view_id: number | string | null;
      onSelectView: (id: number | string) => void;
      onAddView?: () => void;
    };

/**
 * The row of board views ("Main table", team names, …).
 *
 * Two modes, discriminated by the shape of the props: the original static
 * `{ primary_label, views }` mode (Client Hub's non-interactive mockup tabs,
 * unchanged) and an interactive `{ tabs, active_view_id, onSelectView }` mode
 * (the reusable `TableBoardView` engine's real, clickable tabs).
 */
const BoardViewTabs: React.FC<BoardViewTabsProps> = (props) => {
  if ("tabs" in props) {
    const { tabs, active_view_id, onSelectView, onAddView } = props;

    return (
      <div className="flex items-center gap-0.5 border-b border-shell-border">
        {tabs.map((tab, index) => {
          const is_active = tab.id === active_view_id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              className={
                is_active
                  ? "-mb-px mr-3.5 flex cursor-pointer items-center gap-2 border-b-2 border-brand-500 px-1 py-[9px] text-[13.5px] font-semibold text-shell-text"
                  : "cursor-pointer whitespace-nowrap px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
              }
            >
              {index === 0 && (
                <span className="text-[#00c875]">
                  <TableViewIcon />
                </span>
              )}
              {tab.label}
            </button>
          );
        })}

        <span className="flex cursor-pointer items-center gap-1.5 px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text">
          All
          <ChevronDownIcon size={11} />
        </span>

        <button
          type="button"
          onClick={onAddView}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          aria-label="Add view"
        >
          <PlusIcon size={15} />
        </button>
      </div>
    );
  }

  const { primary_label, views } = props;

  return (
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
};

export default BoardViewTabs;
