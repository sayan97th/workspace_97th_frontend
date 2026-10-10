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
  /** Optional control at the right end of the title row, e.g. the board's favorite star. */
  title_action?: React.ReactNode;
  /** Extra classes on the panel body, e.g. a scoped palette such as `board-chrome-theme`. */
  className?: string;
  rows: InfoDropdownRow[];
  width?: number;
  align?: "start" | "end";
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Renders a plain text blurb with its http(s) URLs as links, like monday's board description. */
const renderLinkedText = (text: string): React.ReactNode =>
  text.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#1f76c2] hover:underline"
      >
        {part}
      </a>
    ) : (
      part
    )
  );

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
  title_action,
  className = "",
  rows,
  width = 340,
  align = "start",
}) => (
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align}>
    <div className={`px-6 pb-5 pt-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 truncate font-heading text-[18px] font-medium leading-6 text-shell-text">{title}</div>
        {title_action}
      </div>
      {description && (
        <p className="mt-3 whitespace-pre-line break-words text-[14px] leading-5 text-shell-text">{renderLinkedText(description)}</p>
      )}

      <div className="my-4 h-px bg-shell-border" />

      <div className="mb-1 text-[16px] font-medium leading-6 text-shell-text">{section_label}</div>

      <div className="flex flex-col">
        {rows.map((row) => {
          const row_content = (
            <>
              <span className="w-[120px] flex-none text-[14px] text-shell-text-secondary">{row.label}</span>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-[14px] text-shell-text">{row.value}</span>
            </>
          );
          return row.onClick ? (
            <button
              key={row.key}
              type="button"
              onClick={row.onClick}
              className="-mx-2 flex min-h-12 items-center gap-3 rounded-[4px] px-2 text-left transition-colors hover:bg-shell-hover"
            >
              {row_content}
            </button>
          ) : (
            <div key={row.key} className="flex min-h-12 items-center gap-3">
              {row_content}
            </div>
          );
        })}
      </div>
    </div>
  </BoardPopover>
);

export default InfoDropdown;
