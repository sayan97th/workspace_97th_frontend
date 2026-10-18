"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon, EyeIcon, SearchIcon, ViewsIcon } from "@/icons/workspace-icons";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import BoardPopover from "../toolbar/BoardPopover";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import { UnsavedChangesDot, ViewTabIcon, isViewTabIconAccent } from "./ViewTabFace";

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
  /** Opens the "Manage views" dialog. Omit to hide the footer link. */
  onManageViews?: () => void;
};

const matchesQuery = (tab: BoardViewTabItem, query: string) =>
  !query || tab.label.toLowerCase().includes(query) || (tab.description ?? "").toLowerCase().includes(query);

/**
 * The "More" dropdown at the end of the tab bar: a searchable list of the
 * tabs that didn't fit, plus the viewer's hidden tabs with a way to show them
 * again, and a link to the "Manage views" dialog.
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
    <div key={tab.id} className="vt-menu-row" data-active={tab.id === active_view_id} data-hidden-row={is_hidden_row}>
      <button type="button" onClick={() => select(tab.id)} className="vt-menu-row-main">
        <span className="vt-menu-row-glyph" data-accent={isViewTabIconAccent(tab)}>
          <ViewTabIcon tab={tab} size={16} />
        </span>
        <span className="vt-menu-row-text">
          <span className="vt-menu-row-label">{tab.label}</span>
          <span className="vt-menu-row-caption">{tab.description || `${getBoardViewTypeOption(tab.view_type).label} view`}</span>
        </span>
        {tab.has_unsaved_changes && <UnsavedChangesDot />}
      </button>
      {is_hidden_row && onShowView && (
        <PortalTooltip content="Show in the tab bar">
          <button type="button" onClick={() => onShowView(tab.id)} aria-label={`Show ${tab.label}`} className="vt-menu-row-action">
            <EyeIcon size={14} />
            Show
          </button>
        </PortalTooltip>
      )}
    </div>
  );

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={300} unstyled>
      <div className="vt-popover" aria-label="More views">
        <div className="vt-menu-search">
          <label className="vt-search">
            <SearchIcon size={14} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search views"
              aria-label="Search views"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="vt-search-clear">
                <CloseIcon size={12} />
              </button>
            )}
          </label>
        </div>

        <div className="vt-menu-list shell-scrollbar">
          {matching_overflow.length > 0 && (
            <>
              <p className="vt-menu-section-title">
                <span>More views</span>
                <span className="vt-menu-section-count">{matching_overflow.length}</span>
              </p>
              {matching_overflow.map((tab) => renderRow(tab, false))}
            </>
          )}
          {matching_hidden.length > 0 && (
            <>
              <p className="vt-menu-section-title">
                <span>Hidden views</span>
                <span className="vt-menu-section-count">{matching_hidden.length}</span>
              </p>
              {matching_hidden.map((tab) => renderRow(tab, true))}
            </>
          )}
          {!has_results && (
            <div className="vt-menu-empty">
              <SearchIcon size={18} />
              No views match your search.
            </div>
          )}
        </div>

        {onManageViews && (
          <>
            <div className="vt-menu-divider" />
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageViews();
              }}
              className="vt-menu-footer"
            >
              <ViewsIcon size={16} />
              Manage views
            </button>
          </>
        )}
      </div>
    </BoardPopover>
  );
};

export default MoreViewsMenu;
