"use client";
import React from "react";
import { CloseIcon } from "@/icons/workspace-icons";

export type SelectionActionBarAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (anchor_el: HTMLButtonElement) => void;
  disabled?: boolean;
  /** Tooltip shown on hover — required when `disabled` so the reason isn't a dead end. */
  disabled_reason?: string;
  /** Renders the icon/label in the danger (red) accent — used by "Delete". */
  danger?: boolean;
};

export type SelectionActionBarProps = {
  /** How many rows are checked — drives the badge count and the "N Task(s) selected" copy. */
  selected_count: number;
  /** Singular noun for the selected rows, e.g. "Task" reads as "1 Task selected" / "3 Tasks selected". Defaults to "Task". */
  item_noun?: string;
  actions: SelectionActionBarAction[];
  /** Clears the selection, dismissing the bar. */
  onClose: () => void;
};

/**
 * Floating bulk-action bar, Monday.com-style: appears once one or more row
 * checkboxes are checked in a {@link BoardTable}, anchored bottom-center over
 * the board content (see `BoardShell`'s `selectionBar` slot). Purely
 * presentational — `TableBoardView` owns the selection state and supplies
 * each action's real handler.
 */
const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selected_count,
  item_noun = "Task",
  actions,
  onClose,
}) => {
  if (selected_count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Selected rows"
      className="flex items-center gap-1 rounded-2xl border border-boardtree-border bg-boardtree-surface py-2 pl-4 pr-2 text-boardtree-text shadow-2xl shadow-black/40 backdrop-blur-sm animate-[selection-bar-in_0.16s_ease-out]"
    >
      <div className="flex items-center gap-2 pr-3">
        <span className="flex h-6 min-w-6 flex-none items-center justify-center rounded-full bg-[#0073ea] px-1.5 text-[12px] font-bold text-white">
          {selected_count}
        </span>
        <span className="whitespace-nowrap text-[13px] font-semibold">
          {item_noun}
          {selected_count > 1 ? "s" : ""} selected
        </span>
      </div>

      <span className="h-7 w-px flex-none bg-boardtree-border" aria-hidden="true" />

      <div className="flex items-center gap-0.5 px-1">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={action.disabled}
            title={action.disabled ? action.disabled_reason : action.label}
            onClick={(event) => action.onClick(event.currentTarget)}
            className={`group flex w-[62px] flex-none flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${
              action.disabled
                ? "cursor-default opacity-35"
                : action.danger
                  ? "cursor-pointer hover:bg-error-500/[0.12]"
                  : "cursor-pointer hover:bg-boardtree-hover"
            }`}
          >
            <span className={action.danger && !action.disabled ? "text-error-400" : "text-boardtree-text-secondary"}>
              {action.icon}
            </span>
            <span
              className={`text-[10.5px] font-medium leading-none ${
                action.danger && !action.disabled ? "text-error-400" : "text-boardtree-text-muted"
              }`}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <span className="h-7 w-px flex-none bg-boardtree-border" aria-hidden="true" />

      <button
        type="button"
        onClick={onClose}
        aria-label="Clear selection"
        title="Clear selection"
        className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text"
      >
        <CloseIcon size={13} />
      </button>
    </div>
  );
};

export default SelectionActionBar;
