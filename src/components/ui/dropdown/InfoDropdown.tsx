"use client";
import React from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";

export type InfoDropdownRow = {
  key: string;
  label: string;
  value: React.ReactNode;
  /** Makes the row clickable (e.g. "Workspace type" opening the change-type dialog). */
  onClick?: () => void;
};

export type InfoDropdownProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Bold heading at the top of the panel (workspace/board name). */
  title: string;
  /** Small bold label above the rows, e.g. "Workspace info" / "Board info". */
  section_label: string;
  /** Optional blurb rendered between the title and the divider. */
  description?: string | null;
  rows: InfoDropdownRow[];
  width?: number;
  align?: "start" | "end";
};

/**
 * Small "info" popover anchored to a chevron next to a title — the shared shape
 * behind both the workspace-title dropdown (Workspace info: type/members) and
 * the board-title dropdown (Board info: description/type/owners/created
 * by/notifications). Any future title with a similar "chevron -> quick facts"
 * affordance should reuse this instead of hand-rolling another popover.
 */
const InfoDropdown: React.FC<InfoDropdownProps> = ({
  anchor_el,
  is_open,
  onClose,
  title,
  section_label,
  description,
  rows,
  width = 340,
  align = "start",
}) => (
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align}>
    <div className="p-4">
      <div className="truncate text-[16px] font-bold text-shell-text">{title}</div>
      {description && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-shell-text-muted">{description}</p>
      )}

      <div className="my-3.5 h-px bg-shell-border" />

      <div className="mb-3.5 text-[13px] font-bold text-shell-text-secondary">{section_label}</div>

      <div className="flex flex-col gap-3.5">
        {rows.map((row) =>
          row.onClick ? (
            <button
              key={row.key}
              type="button"
              onClick={row.onClick}
              className="flex items-center gap-3 rounded-md text-left transition-colors hover:text-brand-500"
            >
              <span className="w-[110px] flex-none text-[13.5px] text-shell-text-muted">
                {row.label}
              </span>
              <span className="flex flex-1 items-center gap-2 text-[13.5px] text-shell-text">
                {row.value}
              </span>
            </button>
          ) : (
            <div key={row.key} className="flex items-center gap-3">
              <span className="w-[110px] flex-none text-[13.5px] text-shell-text-muted">
                {row.label}
              </span>
              <span className="flex flex-1 items-center gap-2 text-[13.5px] text-shell-text">
                {row.value}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  </BoardPopover>
);

export default InfoDropdown;
