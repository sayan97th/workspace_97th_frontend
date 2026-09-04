"use client";

import { useEffect, useRef, useState } from "react";
import PopoverPanel from "./PopoverPanel";
import ColumnPicker from "./ColumnPicker";
import ColumnSettingsPanel from "./ColumnSettingsPanel";
import type { ColumnTypeDef } from "../constants";
import type { ColumnKind, StatusDef } from "../types";

interface ColumnMenuProps {
  title: string;
  /** Undefined for the item-title/sub-title virtual columns — renders the reduced menu (rename + sort + collapse only). */
  column?: { id: string; kind: ColumnKind; width: number; options?: StatusDef[] };
  can_delete: boolean;
  sort_dir: "asc" | "desc" | null;
  is_group_by_eligible: boolean;
  onRename: (title: string) => void;
  onSort: (direction: "asc" | "desc" | null) => void;
  onUpdateSettings: (patch: { width?: number; hideable?: boolean; pinnable?: boolean }) => void;
  onEditLabels?: () => void;
  onRequestFilter: () => void;
  onRequestGroupBy: () => void;
  onCollapseAll: () => void;
  onDuplicate: () => void;
  onAddColumnRight: (kind: ColumnKind, label: string, default_width: number) => void;
  onChangeType: (kind: ColumnKind, default_width: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

const ROW_ITEM = "flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";
const ROW_DISABLED = "flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-text-faint cursor-default";

type Sub = "settings" | "add" | "type" | null;

/**
 * Rows sit directly on top of each other while their flyouts render off to the side,
 * so a diagonal mouse move toward a flyout briefly crosses a neighboring row's box.
 * Delaying the switch/close while a flyout is already open gives the cursor time to
 * land on it instead of the hover state flipping mid-transit.
 */
const HOVER_INTENT_DELAY_MS = 250;

export default function ColumnMenu({
  title, column, can_delete, sort_dir, is_group_by_eligible,
  onRename, onSort, onUpdateSettings, onEditLabels, onRequestFilter, onRequestGroupBy, onCollapseAll,
  onDuplicate, onAddColumnRight, onChangeType, onDelete, onClose,
}: ColumnMenuProps) {
  const [draft, setDraft] = useState(title);
  const [sub, setSub] = useState<Sub>(null);
  const [flyout_query, setFlyoutQuery] = useState("");
  const close_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (close_timeout_ref.current !== null) {
      clearTimeout(close_timeout_ref.current);
      close_timeout_ref.current = null;
    }
  };

  useEffect(() => clearCloseTimeout, []);

  /** Opens (or closes) a submenu right away — used for explicit actions, not hover transitions. */
  const openSub = (next: Sub) => {
    clearCloseTimeout();
    setSub(next);
    setFlyoutQuery("");
  };

  /**
   * Hover-driven submenu change (also used for leaving the whole menu — see the
   * onMouseLeave below). If no flyout is currently open, switching is instant.
   * If a flyout IS open, the switch/close is delayed so the user can cross the gap
   * into it without it closing under the cursor; re-entering the still-open item
   * (including its flyout, which bubbles the same enter) cancels the delay.
   */
  const requestSub = (next: Sub) => {
    if (sub === next) {
      clearCloseTimeout();
      return;
    }
    if (sub === null) {
      openSub(next);
      return;
    }
    clearCloseTimeout();
    close_timeout_ref.current = setTimeout(() => {
      close_timeout_ref.current = null;
      setSub(next);
      setFlyoutQuery("");
    }, HOVER_INTENT_DELAY_MS);
  };

  const handlePickAddRight = (type: ColumnTypeDef) => { onAddColumnRight(type.kind, type.label, type.default_width); onClose(); };
  const handlePickChangeType = (type: ColumnTypeDef) => { onChangeType(type.kind, type.default_width); onClose(); };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[268px] -translate-x-1/2 p-2.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && onRename(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="mb-2 h-8 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
      />
      <div className="h-px bg-boardtree-border-soft" />
      <div className="flex flex-col gap-0.5 pt-1.5" onMouseLeave={() => requestSub(null)}>
        {column && (
          <div className="relative" onMouseEnter={() => requestSub("settings")}>
            <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "settings" ? "var(--color-boardtree-hover)" : "transparent" }}>
              <span className="w-4 text-boardtree-text-muted">
                <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 2.6 V4.2 M8 11.8 V13.4 M2.6 8 H4.2 M11.8 8 H13.4 M4.3 4.3 L5.4 5.4 M10.6 10.6 L11.7 11.7 M4.3 11.7 L5.4 10.6 M10.6 5.4 L11.7 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </span>
              <span className="flex-1">Settings</span>
              <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
            </div>
            {sub === "settings" && (
              <ColumnSettingsPanel
                width={column.width}
                hideable
                pinnable
                can_edit_labels={!!onEditLabels}
                onWidthChange={(width) => onUpdateSettings({ width })}
                onHideableChange={(value) => onUpdateSettings({ hideable: value })}
                onPinnableChange={(value) => onUpdateSettings({ pinnable: value })}
                onEditLabels={() => { onEditLabels?.(); onClose(); }}
              />
            )}
          </div>
        )}

        {column && (
          <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => { onRequestFilter(); onClose(); }} className={ROW_ITEM}>
            <span className="w-4 text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="14" height="14"><path d="M2.8 3.4 H13.2 L9.2 8.2 V12.2 L6.8 13.4 V8.2 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            </span>
            <span className="flex-1">Filter</span>
          </button>
        )}

        <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => onSort(sort_dir === "asc" ? null : "asc")} className={ROW_ITEM}>
          <span className="w-4 text-boardtree-text-muted">↑</span>
          <span className="flex-1">{sort_dir === "asc" ? "Remove ascending sort" : "Sort ascending"}</span>
        </button>
        <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => onSort(sort_dir === "desc" ? null : "desc")} className={ROW_ITEM}>
          <span className="w-4 text-boardtree-text-muted">↓</span>
          <span className="flex-1">{sort_dir === "desc" ? "Remove descending sort" : "Sort descending"}</span>
        </button>

        <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => { onCollapseAll(); onClose(); }} className={ROW_ITEM}>
          <span className="w-4 text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2.4 V13.6 M5.4 4.8 L8 2.2 L10.6 4.8 M5.4 11.2 L8 13.8 L10.6 11.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1">Collapse all groups</span>
        </button>

        {column && (
          is_group_by_eligible ? (
            <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => { onRequestGroupBy(); onClose(); }} className={ROW_ITEM}>
              <span className="w-4 text-boardtree-text-muted">
                <svg viewBox="0 0 16 16" width="14" height="14"><rect x="2.4" y="2.4" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="8.8" y="2.4" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2.4" y="8.8" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="8.8" y="8.8" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
              </span>
              <span className="flex-1">Group by</span>
            </button>
          ) : (
            <div className={ROW_DISABLED}>
              <span className="w-4 opacity-70">
                <svg viewBox="0 0 16 16" width="14" height="14"><rect x="2.4" y="2.4" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="8.8" y="2.4" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2.4" y="8.8" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="8.8" y="8.8" width="4.8" height="4.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
              </span>
              <span className="flex-1">Group by</span>
            </div>
          )
        )}

        {column && (
          <>
            <div className="my-1 h-px bg-boardtree-border-soft" />

            <button type="button" onMouseEnter={() => requestSub(null)} onClick={() => { onDuplicate(); onClose(); }} className={ROW_ITEM}>
              <span className="w-4 text-boardtree-text-muted">
                <svg viewBox="0 0 16 16" width="14" height="14"><rect x="5.4" y="2.4" width="8.2" height="8.2" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.6 13.6 H3.8 a1.4 1.4 0 0 1 -1.4 -1.4 V5.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              </span>
              <span className="flex-1">Duplicate column</span>
            </button>

            <div className="relative" onMouseEnter={() => requestSub("add")}>
              <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "add" ? "var(--color-boardtree-hover)" : "transparent" }}>
                <span className="w-4 text-boardtree-text-muted">
                  <svg viewBox="0 0 16 16" width="14" height="14"><path d="M5.8 2.6 V13.4 M8.4 8 H13.6 M11 5.4 V10.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                </span>
                <span className="flex-1">Add column to the right</span>
                <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
              </div>
              {sub === "add" && (
                <div className="absolute left-full top-[-6px] z-10 ml-1">
                  <ColumnPicker query={flyout_query} onQueryChange={setFlyoutQuery} onPick={handlePickAddRight} onClose={() => openSub(null)} align="left" />
                </div>
              )}
            </div>

            <div className="relative" onMouseEnter={() => requestSub("type")}>
              <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "type" ? "var(--color-boardtree-hover)" : "transparent" }}>
                <span className="w-4 text-boardtree-text-muted">
                  <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 6.4 H10.6 M8.4 4.2 L10.6 6.4 L8.4 8.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 9.6 H5.4 M7.6 7.4 L5.4 9.6 L7.6 11.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className="flex-1">Change column type</span>
                <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
              </div>
              {sub === "type" && (
                <div className="absolute left-full top-[-6px] z-10 ml-1">
                  <ColumnPicker query={flyout_query} onQueryChange={setFlyoutQuery} onPick={handlePickChangeType} onClose={() => openSub(null)} align="left" />
                </div>
              )}
            </div>
          </>
        )}

        <div className={ROW_DISABLED} title="Coming soon">
          <span className="w-4 opacity-70">
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M5.2 3 H8.2 V4.6 a1.4 1.4 0 0 0 2.8 0 V3 H13.8 V6 H12.2 a1.4 1.4 0 0 0 0 2.8 H13.8 V13 H10.8 V11.4 a1.4 1.4 0 0 0 -2.8 0 V13 H5.2 V10 H3.6 a1.4 1.4 0 0 1 0 -2.8 H5.2 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1">Column extensions</span>
        </div>

        {column && can_delete && (
          <>
            <div className="my-1 h-px bg-boardtree-border-soft" />
            <button
              type="button"
              onMouseEnter={() => requestSub(null)}
              onClick={() => { onDelete(); onClose(); }}
              className="flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-boardtree-danger hover:bg-boardtree-danger-hover"
            >
              <span className="w-4 opacity-80">
                <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="flex-1">Delete column</span>
            </button>
          </>
        )}
      </div>
    </PopoverPanel>
  );
}
