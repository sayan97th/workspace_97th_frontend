"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { FilesTabIcon, InfoBoxesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import BoardItemOptionsMenu from "./BoardItemOptionsMenu";
import FilesPanel from "./FilesPanel";
import InfoBoxesPanel from "./InfoBoxesPanel";
import SlideOverPanel from "./SlideOverPanel";
import UpdatesPanel from "./UpdatesPanel";
import type { BoardItemDrawerApi, DrawerTabId } from "./types";
import { useCommentPresence } from "./useCommentPresence";
import { useLatchWhileOpen } from "./useLatchWhileOpen";

export type BoardItemDrawerProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
};

type TabDefinition = {
  id: DrawerTabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

/**
 * Slide-in item detail drawer: header (close button, title, "…" options menu) +
 * tab bar (Updates/Files/Activity Log/Info Boxes) driven entirely by
 * {@link useBoardItemDrawer}. Generic over the row type
 * so any board view — Client Hub today, others later — can reuse it as-is.
 */
function BoardItemDrawer<TRow>({ drawer }: BoardItemDrawerProps<TRow>) {
  // Keeps showing the row that was open while `SlideOverPanel` slides the
  // panel closed — `drawer.close()` clears `open_row` (and everything
  // derived from it) synchronously, well before that exit animation ends.
  const content = useLatchWhileOpen(drawer, drawer.is_open);

  // Only joined for a real, backend-persisted item (`board_id` set) — mock
  // boards (Client Hub) have no matching `BoardItem` row for the presence
  // channel's auth callback to resolve. Bare name (no `presence-` prefix):
  // `Echo.join()` prepends that itself, matching `Broadcast::channel('presence-board-item.{id}', ...)`.
  const presence_channel_name =
    drawer.board_id !== undefined && content.open_row_id ? `board-item.${content.open_row_id}` : null;
  const presence = useCommentPresence(presence_channel_name);

  if (!drawer.is_open && !content.is_open) return null;

  const tabs: TabDefinition[] = [
    { id: "updates", label: "Updates", icon: <UpdatesTabIcon size={15} />, count: content.comments.length + content.activity_log.length },
    { id: "files", label: "Files", icon: <FilesTabIcon size={15} />, count: content.all_attachments.length },
    { id: "info_boxes", label: "Info Boxes", icon: <InfoBoxesTabIcon size={15} /> },
  ];

  return (
    <SlideOverPanel
      is_open={drawer.is_open}
      onClose={drawer.close}
      panel_class_name="w-[clamp(520px,46vw,960px)] max-w-[94vw] border-l border-shell-border-strong bg-shell-panel text-shell-text shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
    >
      {/* Header: close button, item title, "…" options menu, same arrangement as monday.com's item drawer. */}
      <div className="flex flex-none items-start gap-3 px-6 pb-3 pt-5">
        <button
          type="button"
          onClick={drawer.close}
          aria-label="Close item drawer"
          className="mt-[3px] flex h-8 w-8 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          <CloseIcon size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-[7px] text-[12px] font-medium text-shell-text-faint">
            <svg width="13" height="13" viewBox="0 0 16 16" className="flex-none" style={{ color: content.accent_color }}>
              <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="truncate">{content.eyebrow_label}</span>
          </div>
          <h2
            className="m-0 break-words text-[26px] font-normal leading-[1.25] text-shell-text"
            style={{ textWrap: "pretty" }}
          >
            {content.open_row_title}
          </h2>
        </div>
        <div className="mt-[3px] flex flex-none items-center">
          <BoardItemOptionsMenu drawer={content} onItemRemoved={drawer.close} />
        </div>
      </div>

      {content.item_action_feedback && (
        <div
          role="status"
          className={`mx-6 mb-2 flex flex-none items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] font-semibold ${
            content.item_action_feedback.tone === "success"
              ? "border-[#00c875] bg-[rgba(0,200,117,0.12)] text-[#00c875]"
              : "border-[#e2445c] bg-[rgba(226,68,92,0.12)] text-[#e2445c]"
          }`}
        >
          <span>{content.item_action_feedback.message}</span>
          <button
            type="button"
            onClick={drawer.dismissItemActionFeedback}
            aria-label="Dismiss message"
            className="flex h-5 w-5 flex-none items-center justify-center rounded-md hover:bg-shell-hover"
          >
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-none items-center gap-0.5 border-b border-shell-border px-5">
        {tabs.map((tab) => {
          const is_active = content.active_tab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => drawer.setActiveTab(tab.id)}
              className={`relative flex items-center gap-[7px] px-[13px] py-3 text-[14px] font-medium ${
                is_active ? "text-shell-text" : "text-shell-text-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-[20px] bg-shell-hover-strong px-[7px] py-px text-[11px] font-bold text-shell-text-secondary">
                  {tab.count}
                </span>
              )}
              {is_active && (
                <span
                  className="absolute bottom-[-1px] left-2 right-2 h-[3px] rounded-t-[3px]"
                  style={{ background: content.accent_color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      {content.active_tab === "updates" && <UpdatesPanel drawer={content} presence={presence} />}
      {content.active_tab === "files" && <FilesPanel drawer={content} />}
      {content.active_tab === "info_boxes" && <InfoBoxesPanel info_boxes={content.info_boxes} />}
    </SlideOverPanel>
  );
}

export default BoardItemDrawer;
