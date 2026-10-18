"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, DeleteIcon, EyeIcon, EyeOffIcon, HomeIcon, RefreshIcon, SearchIcon } from "@/icons/workspace-icons";
import { EditPencilIcon } from "@/icons/board-icons";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import ViewCreatorAvatar from "./ViewCreatorAvatar";
import { DescriptionCounter, VIEW_DESCRIPTION_MAX_LENGTH } from "./ViewDescriptionPopover";
import { ViewStatusChips, formatViewDate } from "./ViewTabInfoCard";
import { ViewTabIcon, isViewTabIconAccent } from "./ViewTabFace";

export type ManageViewsModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Every tab in display order, hidden ones included. */
  tabs: BoardViewTabItem[];
  active_view_id: number | string | null;
  onSelectView: (id: number | string) => void;
  onToggleHiddenView?: (id: number | string) => void;
  onSetDefaultView?: (id: number | string | null) => void;
  onChangeDescription?: (id: number | string, description: string | null) => void;
  /** Starts the delete confirmation for a tab. Omit to hide the delete buttons. */
  onRequestDelete?: (id: number | string) => void;
  has_personal_order: boolean;
  onResetOrder?: () => void;
};

type VisibilityFilter = "all" | "shown" | "hidden";

const VISIBILITY_FILTERS: Array<{ key: VisibilityFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "shown", label: "Shown" },
  { key: "hidden", label: "Hidden" },
];

const matchesQuery = (tab: BoardViewTabItem, query: string) =>
  !query ||
  tab.label.toLowerCase().includes(query) ||
  (tab.description ?? "").toLowerCase().includes(query) ||
  (tab.creator_name ?? "").toLowerCase().includes(query) ||
  getBoardViewTypeOption(tab.view_type).label.toLowerCase().includes(query);

const matchesVisibility = (tab: BoardViewTabItem, filter: VisibilityFilter) =>
  filter === "all" || (filter === "hidden" ? Boolean(tab.is_hidden) : !tab.is_hidden);

/**
 * Every view of the board in one searchable list: type, description, creator
 * and dates, plus quick actions (open, set as default, hide for me, edit the
 * description, delete). Hiding and the default view only affect the viewer.
 */
const ManageViewsModal: React.FC<ManageViewsModalProps> = ({
  is_open,
  onClose,
  tabs,
  active_view_id,
  onSelectView,
  onToggleHiddenView,
  onSetDefaultView,
  onChangeDescription,
  onRequestDelete,
  has_personal_order,
  onResetOrder,
}) => {
  const [query, setQuery] = useState("");
  const [visibility_filter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [editing_id, setEditingId] = useState<number | string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");

  useEffect(() => {
    if (!is_open) return;
    setQuery("");
    setVisibilityFilter("all");
    setEditingId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  const normalized_query = query.trim().toLowerCase();
  const searched_tabs = tabs.filter((tab) => matchesQuery(tab, normalized_query));
  const matching_tabs = searched_tabs.filter((tab) => matchesVisibility(tab, visibility_filter));
  const visible_count = tabs.filter((tab) => !tab.is_hidden).length;
  const hidden_count = tabs.length - visible_count;
  const filter_counts: Record<VisibilityFilter, number> = {
    all: searched_tabs.length,
    shown: searched_tabs.filter((tab) => !tab.is_hidden).length,
    hidden: searched_tabs.filter((tab) => tab.is_hidden).length,
  };

  const startEditing = (tab: BoardViewTabItem) => {
    setEditingId(tab.id);
    setDescriptionDraft(tab.description ?? "");
  };

  const saveDescription = (tab: BoardViewTabItem) => {
    const trimmed = description_draft.trim();
    onChangeDescription?.(tab.id, trimmed ? trimmed : null);
    setEditingId(null);
  };

  const openView = (tab: BoardViewTabItem) => {
    onSelectView(tab.id);
    onClose();
  };

  const renderActions = (tab: BoardViewTabItem, is_editing: boolean) => {
    const can_hide = tab.is_hidden || visible_count > 1;

    return (
      <div className="vt-view-row-actions">
        {onChangeDescription && !tab.is_locked && !is_editing && (
          <PortalTooltip content={tab.description ? "Edit description" : "Add description"}>
            <button type="button" onClick={() => startEditing(tab)} aria-label={`Edit description of ${tab.label}`} className="vt-icon-button">
              <EditPencilIcon size={16} />
            </button>
          </PortalTooltip>
        )}
        {onSetDefaultView && (
          <PortalTooltip
            content={
              tab.is_default ? (tab.is_primary ? "The main view opens first by default" : "Remove as my default view") : "Set as my default view"
            }
          >
            <button
              type="button"
              onClick={() => onSetDefaultView(tab.is_default && !tab.is_primary ? null : tab.id)}
              disabled={tab.is_default && tab.is_primary}
              aria-pressed={Boolean(tab.is_default)}
              aria-label={tab.is_default ? `${tab.label} is your default view` : `Set ${tab.label} as your default view`}
              className="vt-icon-button"
            >
              <HomeIcon size={16} />
            </button>
          </PortalTooltip>
        )}
        {onToggleHiddenView && (
          <PortalTooltip content={can_hide ? (tab.is_hidden ? "Show in the tab bar" : "Hide view for me") : "At least one view must stay visible"}>
            <button
              type="button"
              onClick={() => onToggleHiddenView(tab.id)}
              disabled={!can_hide}
              aria-label={tab.is_hidden ? `Show ${tab.label}` : `Hide ${tab.label} for me`}
              className="vt-icon-button"
            >
              {tab.is_hidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
            </button>
          </PortalTooltip>
        )}
        {onRequestDelete && !tab.is_primary && !tab.is_locked && (
          <PortalTooltip content="Delete view">
            <button type="button" onClick={() => onRequestDelete(tab.id)} aria-label={`Delete ${tab.label}`} className="vt-icon-button" data-tone="danger">
              <DeleteIcon size={16} />
            </button>
          </PortalTooltip>
        )}
      </div>
    );
  };

  const renderRow = (tab: BoardViewTabItem) => {
    const type_option = getBoardViewTypeOption(tab.view_type);
    const created_on = formatViewDate(tab.created_at);
    const updated_on = formatViewDate(tab.updated_at);
    const is_editing = editing_id === tab.id;
    const is_active = tab.id === active_view_id;

    return (
      <li key={tab.id} className="vt-view-row" data-active={is_active}>
        <span className="vt-icon-tile" data-accent={isViewTabIconAccent(tab)} data-muted={Boolean(tab.is_hidden)}>
          <ViewTabIcon tab={tab} size={16} />
        </span>

        <div className="vt-view-row-body">
          <div className="vt-view-row-title">
            <PortalTooltip content={is_active ? "You are on this view" : "Open view"}>
              <button type="button" onClick={() => openView(tab)} aria-current={is_active ? "page" : undefined} className="vt-view-row-name">
                {tab.label}
              </button>
            </PortalTooltip>
            <span className="vt-view-row-type">{type_option.label}</span>
            {is_active && (
              <span className="vt-chip" data-tone="info">
                Current view
              </span>
            )}
            <ViewStatusChips tab={tab} />
          </div>

          {is_editing ? (
            <div className="vt-view-row-editor">
              <textarea
                autoFocus
                value={description_draft}
                maxLength={VIEW_DESCRIPTION_MAX_LENGTH}
                rows={3}
                placeholder="What is this view for? Who should use it?"
                aria-label={`Description of ${tab.label}`}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    saveDescription(tab);
                  }
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setEditingId(null);
                  }
                }}
                className="vt-textarea"
              />
              <div className="vt-form-footer">
                <DescriptionCounter length={description_draft.length} />
                <div className="vt-form-actions">
                  <button type="button" onClick={() => setEditingId(null)} className="vt-button" data-variant="tertiary">
                    Cancel
                  </button>
                  <PortalTooltip content="Save, or press Ctrl + Enter">
                    <button type="button" onClick={() => saveDescription(tab)} className="vt-button" data-variant="primary">
                      Save
                    </button>
                  </PortalTooltip>
                </div>
              </div>
            </div>
          ) : (
            <p className="vt-view-row-description" data-empty={!tab.description}>
              {tab.description || "No description yet."}
            </p>
          )}

          {(tab.creator_name || created_on) && (
            <div className="vt-view-row-meta">
              {tab.creator_name && (
                <>
                  <ViewCreatorAvatar full_name={tab.creator_name} photo_url={tab.creator_photo_url} size={18} />
                  <span>Created by {tab.creator_name}</span>
                </>
              )}
              {created_on && (
                <>
                  {tab.creator_name && <span className="vt-meta-separator" aria-hidden />}
                  <span>{tab.creator_name ? created_on : `Created on ${created_on}`}</span>
                </>
              )}
              {updated_on && updated_on !== created_on && (
                <>
                  <span className="vt-meta-separator" aria-hidden />
                  <span>Updated {updated_on}</span>
                </>
              )}
            </div>
          )}
        </div>

        {renderActions(tab, is_editing)}
      </li>
    );
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="manage-views-title" className="vt-modal-root">
      <div className="vt-modal-overlay" onClick={onClose} aria-hidden="true" />

      <div className="vt-modal">
        <div className="vt-modal-header">
          <div className="min-w-0">
            <h2 id="manage-views-title" className="vt-modal-title">
              Manage views
            </h2>
            <p className="vt-modal-subtitle">
              {tabs.length} {tabs.length === 1 ? "view" : "views"} on this board
              {hidden_count > 0 ? `, ${hidden_count} hidden for you` : ""}.
            </p>
          </div>
          <PortalTooltip content="Close" placement="bottom">
            <button type="button" onClick={onClose} aria-label="Close" className="vt-icon-button">
              <CloseIcon size={18} />
            </button>
          </PortalTooltip>
        </div>

        <div className="vt-modal-toolbar">
          <label className="vt-search" data-size="lg">
            <SearchIcon size={16} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, type, description or creator"
              aria-label="Search views"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="vt-search-clear">
                <CloseIcon size={12} />
              </button>
            )}
          </label>

          <div className="vt-segmented" role="group" aria-label="Filter views by visibility">
            {VISIBILITY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={visibility_filter === filter.key}
                onClick={() => setVisibilityFilter(filter.key)}
                className="vt-segment"
              >
                {filter.label}
                <span className="vt-segment-count">{filter_counts[filter.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="vt-modal-list shell-scrollbar">
          {matching_tabs.length === 0 ? (
            <li className="vt-modal-empty">
              <SearchIcon size={22} />
              <strong>{normalized_query ? "No views match your search" : "No hidden views"}</strong>
              <span>{normalized_query ? "Try another name, type or creator." : "Views you hide for yourself show up here."}</span>
            </li>
          ) : (
            matching_tabs.map(renderRow)
          )}
        </ul>

        <div className="vt-modal-footer">
          {onResetOrder && has_personal_order ? (
            <PortalTooltip content="Go back to the board's own tab order">
              <button type="button" onClick={onResetOrder} className="vt-button" data-variant="tertiary">
                <RefreshIcon size={14} />
                Reset to default order
              </button>
            </PortalTooltip>
          ) : (
            <span className="vt-modal-footer-note">Hiding a view or picking your default only changes what you see.</span>
          )}
          <button type="button" onClick={onClose} className="vt-button" data-variant="primary" data-size="lg">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManageViewsModal;
