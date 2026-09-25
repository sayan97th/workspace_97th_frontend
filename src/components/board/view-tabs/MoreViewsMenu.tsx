"use client";
import React, { useEffect, useState } from "react";
import { EyeIcon, SearchIcon, ViewsIcon } from "@/icons/workspace-icons";
import BoardPopover from "../toolbar/BoardPopover";
import type { BoardViewTabItem } from "../BoardViewTabs";
import { UnsavedChangesDot, ViewTabIcon, viewTabIconColorClass } from "./ViewTabFace";

export type MoreViewsMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Tabs that didn't fit in the bar. */
  overflow_tabs: BoardViewTabItem[];
  /** Tabs the viewer hid for themselves. */
  hidden_tabs: BoardViewTabItem[];
  active_view_id: number | string | null;
  onSelectView: (id: number | string) => void;
  /** Shows a hidden tab again. Omit to hide the "Show" buttons. */
  onShowView?: (id: number | string) => void;
  /** Opens the "Manage views" panel. Omit to hide the footer link. */
  onManageViews?: () => void;
};

const matchesQuery = (tab: BoardViewTabItem, query: string) =>
  !query || tab.label.toLowerCase().includes(query) || (tab.description ?? "").toLowerCase().includes(query);

/**
 * The "More" dropdown at the end of the tab bar: a searchable list of the
 * tabs that didn't fit, plus the viewer's hidden tabs with a way to show them
 * again, and a link to the "Manage views" panel.
 */
const MoreViewsMenu: React.FC<MoreViewsMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  overflow_tabs,
  hidden_tabs,
  active_view_id,
  onSelectView,
  onShowView,
  onManageViews,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (is_open) setQuery("");
  }, [is_open]);

  const normalized_query = query.trim().toLowerCase();
  const matching_overflow = overflow_tabs.filter((tab) => matchesQuery(tab, normalized_query));
  const matching_hidden = hidden_tabs.filter((tab) => matchesQuery(tab, normalized_query));
  const has_results = matching_overflow.length > 0 || matching_hidden.length > 0;

  const select = (id: number | string) => {
    onSelectView(id);
    onClose();
  };

  const renderRow = (tab: BoardViewTabItem, is_hidden_row: boolean) => (
    <div
      key={tab.id}
      className={`group/row flex items-center gap-1 rounded-[7px] pr-1 transition-colors hover:bg-shell-hover ${
        tab.id === active_view_id ? "bg-shell-hover" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => select(tab.id)}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
      >
        <span className={`flex w-4 flex-none items-center justify-center ${viewTabIconColorClass(tab)} ${is_hidden_row ? "opacity-60" : ""}`}>
          <ViewTabIcon tab={tab} />
        </span>
        <span className={`truncate text-[13px] ${is_hidden_row ? "text-shell-text-muted" : "text-shell-text"}`}>{tab.label}</span>
        {tab.has_unsaved_changes && <UnsavedChangesDot />}
      </button>
      {is_hidden_row && onShowView && (
        <button
          type="button"
          onClick={() => onShowView(tab.id)}
          aria-label={`Show ${tab.label}`}
          title="Show in the tab bar"
          className="flex h-6 flex-none items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold text-shell-text-muted transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
        >
          <EyeIcon size={12} />
          Show
        </button>
      )}
    </div>
  );

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={280}>
      <div className="flex flex-col p-2">
        <label className="mb-1.5 flex items-center gap-2 rounded-[8px] border border-shell-border-strong bg-shell-bg px-2.5 py-1.5 focus-within:border-brand-500">
          <span className="text-shell-text-faint">
            <SearchIcon size={13} />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search views"
            aria-label="Search views"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
          />
        </label>

        <div className="shell-scrollbar max-h-[320px] overflow-y-auto">
          {matching_overflow.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-shell-text-faint">More views</p>
              {matching_overflow.map((tab) => renderRow(tab, false))}
            </>
          )}
          {matching_hidden.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-shell-text-faint">Hidden views</p>
              {matching_hidden.map((tab) => renderRow(tab, true))}
            </>
          )}
          {!has_results && <p className="px-2 py-3 text-center text-[12.5px] text-shell-text-faint">No views match your search.</p>}
        </div>

        {onManageViews && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onManageViews();
            }}
            className="mt-1.5 flex items-center gap-2 border-t border-shell-border px-2 pb-0.5 pt-2 text-left text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:text-shell-text"
          >
            <ViewsIcon size={13} />
            Manage views
          </button>
        )}
      </div>
    </BoardPopover>
  );
};

export default MoreViewsMenu;
