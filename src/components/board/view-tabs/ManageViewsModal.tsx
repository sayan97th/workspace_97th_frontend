"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, DeleteIcon, EyeIcon, EyeOffIcon, HomeIcon, RefreshIcon, SearchIcon } from "@/icons/workspace-icons";
import { EditPencilIcon } from "@/icons/board-icons";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import { VIEW_DESCRIPTION_MAX_LENGTH } from "./ViewDescriptionPopover";
import { ViewStatusChips, formatViewDate } from "./ViewTabInfoCard";
import { ViewTabIcon, viewTabIconColorClass } from "./ViewTabFace";

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

const icon_button_base_class =
  "flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
const icon_button_class = `${icon_button_base_class} text-shell-text-muted hover:text-shell-text`;

/**
 * Every view of the board in one searchable list: type, description, creator
 * and date, plus quick actions (open, set as default, hide for me, edit the
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
  const [editing_id, setEditingId] = useState<number | string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");

  useEffect(() => {
    if (!is_open) return;
    setQuery("");
    setEditingId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  const normalized_query = query.trim().toLowerCase();
  const matching_tabs = tabs.filter(
    (tab) =>
      !normalized_query ||
      tab.label.toLowerCase().includes(normalized_query) ||
      (tab.description ?? "").toLowerCase().includes(normalized_query) ||
      (tab.creator_name ?? "").toLowerCase().includes(normalized_query) ||
      getBoardViewTypeOption(tab.view_type).label.toLowerCase().includes(normalized_query)
  );
  const visible_count = tabs.filter((tab) => !tab.is_hidden).length;

  const startEditing = (tab: BoardViewTabItem) => {
    setEditingId(tab.id);
    setDescriptionDraft(tab.description ?? "");
  };

  const saveDescription = (tab: BoardViewTabItem) => {
    const trimmed = description_draft.trim();
    onChangeDescription?.(tab.id, trimmed ? trimmed : null);
    setEditingId(null);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Manage views" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[86vh] w-[640px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-7 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-[-0.01em]">Manage views</h2>
            <p className="text-[12.5px] text-shell-text-muted">
              {tabs.length} {tabs.length === 1 ? "view" : "views"}. Hiding a view or picking your default only changes what you see.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={icon_button_class}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="border-b border-shell-border px-7 py-3">
          <label className="flex items-center gap-2 rounded-[10px] border border-shell-border-strong bg-shell-bg px-3 py-2 focus-within:border-brand-500">
            <span className="text-shell-text-faint">
              <SearchIcon size={14} />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, type, description or creator"
              aria-label="Search views"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
            />
          </label>
        </div>

        <ul className="shell-scrollbar min-h-0 flex-1 divide-y divide-shell-border overflow-y-auto px-4 py-2">
          {matching_tabs.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-shell-text-faint">No views match your search.</li>}

          {matching_tabs.map((tab) => {
            const type_option = getBoardViewTypeOption(tab.view_type);
            const created_on = formatViewDate(tab.created_at);
            const is_editing = editing_id === tab.id;
            const can_hide = tab.is_hidden || visible_count > 1;

            return (
              <li key={tab.id} className="flex gap-3 px-3 py-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-shell-hover ${viewTabIconColorClass(tab)} ${
                    tab.is_hidden ? "opacity-50" : ""
                  }`}
                >
                  <ViewTabIcon tab={tab} size={15} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectView(tab.id);
                        onClose();
                      }}
                      className={`truncate text-left text-[13.5px] font-semibold hover:underline ${
                        tab.id === active_view_id ? "text-brand-400" : "text-shell-text"
                      }`}
                    >
                      {tab.label}
                    </button>
                    <span className="text-[11.5px] text-shell-text-faint">{type_option.label}</span>
                    <ViewStatusChips tab={tab} />
                  </div>

                  {is_editing ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        autoFocus
                        value={description_draft}
                        maxLength={VIEW_DESCRIPTION_MAX_LENGTH}
                        rows={3}
                        placeholder="What is this view for?"
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
                        className="w-full resize-none rounded-[9px] border border-shell-border-strong bg-shell-bg px-2.5 py-2 text-[12.5px] leading-[1.45] text-shell-text outline-none placeholder:text-shell-text-faint focus:border-brand-500"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveDescription(tab)}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`mt-1 line-clamp-2 text-[12.5px] ${tab.description ? "text-shell-text-secondary" : "text-shell-text-faint"}`}>
                      {tab.description || "No description yet."}
                    </p>
                  )}

                  {(tab.creator_name || created_on) && (
                    <p className="mt-1 text-[11.5px] text-shell-text-faint">
                      {tab.creator_name ? `Created by ${tab.creator_name}` : "Created"}
                      {created_on ? ` on ${created_on}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-none items-start gap-0.5">
                  {onChangeDescription && !tab.is_locked && !is_editing && (
                    <button type="button" onClick={() => startEditing(tab)} aria-label={`Edit description of ${tab.label}`} title="Edit description" className={icon_button_class}>
                      <EditPencilIcon size={14} />
                    </button>
                  )}
                  {onSetDefaultView && (
                    <button
                      type="button"
                      onClick={() => onSetDefaultView(tab.is_default && !tab.is_primary ? null : tab.id)}
                      disabled={tab.is_default && tab.is_primary}
                      aria-pressed={Boolean(tab.is_default)}
                      aria-label={tab.is_default ? `${tab.label} is your default view` : `Set ${tab.label} as your default view`}
                      title={tab.is_default ? "Your default view" : "Set as my default view"}
                      className={tab.is_default ? `${icon_button_base_class} text-brand-400` : icon_button_class}
                    >
                      <HomeIcon size={14} />
                    </button>
                  )}
                  {onToggleHiddenView && (
                    <button
                      type="button"
                      onClick={() => onToggleHiddenView(tab.id)}
                      disabled={!can_hide}
                      aria-label={tab.is_hidden ? `Show ${tab.label}` : `Hide ${tab.label} for me`}
                      title={can_hide ? (tab.is_hidden ? "Show view" : "Hide view for me") : "At least one view must stay visible"}
                      className={icon_button_class}
                    >
                      {tab.is_hidden ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                    </button>
                  )}
                  {onRequestDelete && !tab.is_primary && !tab.is_locked && (
                    <button
                      type="button"
                      onClick={() => onRequestDelete(tab.id)}
                      aria-label={`Delete ${tab.label}`}
                      title="Delete view"
                      className={`${icon_button_base_class} text-shell-text-muted hover:text-error-400`}
                    >
                      <DeleteIcon size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-2 border-t border-shell-border px-7 py-4">
          {onResetOrder && has_personal_order ? (
            <button
              type="button"
              onClick={onResetOrder}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
            >
              <RefreshIcon size={13} />
              Reset to default order
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManageViewsModal;
