"use client";
import React from "react";
import { GitBranch, Zap } from "lucide-react";
import { CloseIcon } from "@/icons/board-icons";
import { FilesTabIcon, InfoBoxesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import BoardDrawerHeader from "./BoardDrawerHeader";
import BoardItemOptionsMenu from "./BoardItemOptionsMenu";
import FilesPanel from "./FilesPanel";
import InfoBoxesPanel from "./InfoBoxesPanel";
import SlideOverPanel from "./SlideOverPanel";
import UpdatesPanel from "./UpdatesPanel";
import type { BoardItemDrawerApi, DrawerTabId } from "./types";
import { useCommentPresence, type CommentPresenceUser } from "./useCommentPresence";
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

/** How many viewer avatars the header shows before folding the rest into "+N". */
const MAX_HEADER_VIEWERS = 3;

/** Avatars of the people who have this item open right now, monday style, next to the "..." menu. */
const HeaderViewers: React.FC<{ viewers: CommentPresenceUser[] }> = ({ viewers }) => {
  if (viewers.length === 0) return null;
  const overflow_count = viewers.length - MAX_HEADER_VIEWERS;
  const names = viewers.map((viewer) => viewer.name).join(", ");

  return (
    <div className="board-drawer__viewers" title={`Viewing now: ${names}`} aria-label={`Viewing now: ${names}`}>
      {viewers.slice(0, MAX_HEADER_VIEWERS).map((viewer) => (
        <span key={viewer.id} className="board-drawer__viewer">
          {viewer.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewer.avatar} alt="" />
          ) : (
            viewer.name.slice(0, 1).toUpperCase()
          )}
        </span>
      ))}
      {overflow_count > 0 && <span className="board-drawer__viewer">+{overflow_count}</span>}
    </div>
  );
};

/**
 * Slide in item detail drawer, laid out like monday.com's item drawer: close
 * button and Poppins item title, the board and group it sits in, who is
 * viewing it and the "..." options menu, then the Updates, Files and Info
 * Boxes tabs (plus Dependencies and Automations when given). Driven entirely
 * by {@link useBoardItemDrawer} and generic over the row type, so any board
 * view can reuse it as is.
 */
function BoardItemDrawer<TRow>({ drawer }: BoardItemDrawerProps<TRow>) {
  // Keeps showing the row that was open while `SlideOverPanel` slides the
  // panel closed, `drawer.close()` clears `open_row` (and everything derived
  // from it) synchronously, well before that exit animation ends.
  const content = useLatchWhileOpen(drawer, drawer.is_open);

  // Only joined for a real, backend persisted item (`board_id` set). Mock
  // boards (Client Hub) have no matching `BoardItem` row for the presence
  // channel's auth callback to resolve. Bare name (no `presence-` prefix):
  // `Echo.join()` prepends that itself, matching `Broadcast::channel('presence-board-item.{id}', ...)`.
  const presence_channel_name =
    drawer.board_id !== undefined && content.open_row_id ? `board-item.${content.open_row_id}` : null;
  const presence = useCommentPresence(presence_channel_name, { onCommentPosted: content.onRemoteCommentPosted });

  if (!drawer.is_open && !content.is_open) return null;

  const tabs: TabDefinition[] = [
    { id: "updates", label: "Updates", icon: <UpdatesTabIcon size={16} />, count: content.comments.length },
    { id: "files", label: "Files", icon: <FilesTabIcon size={16} />, count: content.all_attachments.length },
    { id: "info_boxes", label: "Info Boxes", icon: <InfoBoxesTabIcon size={16} /> },
    ...(content.renderDependenciesTab ? [{ id: "dependencies" as const, label: "Dependencies", icon: <GitBranch size={16} /> }] : []),
    ...(content.renderAutomationsTab ? [{ id: "automations" as const, label: "Automations", icon: <Zap size={16} /> }] : []),
  ];

  return (
    <SlideOverPanel
      is_open={drawer.is_open}
      onClose={drawer.close}
      aria_label={content.open_row_title || "Item details"}
      panel_class_name="w-[clamp(560px,48vw,880px)]"
    >
      <BoardDrawerHeader
        title={content.open_row_title}
        title_size="page"
        close_position="start"
        close_label="Close item"
        onClose={drawer.close}
        eyebrow={
          content.eyebrow_label ? (
            <>
              <span className="board-drawer__eyebrow-swatch" style={{ background: content.accent_color }} aria-hidden="true" />
              <span className="board-drawer__eyebrow-text">{content.eyebrow_label}</span>
            </>
          ) : undefined
        }
        actions={
          <>
            <HeaderViewers viewers={presence.presence_users} />
            {presence.presence_users.length > 0 && <span className="board-drawer__divider" aria-hidden="true" />}
            <BoardItemOptionsMenu drawer={content} onItemRemoved={drawer.close} />
          </>
        }
      />

      {content.item_action_feedback && (
        <div role="status" className="board-drawer__banner" data-tone={content.item_action_feedback.tone}>
          <span className="board-drawer__banner-text">{content.item_action_feedback.message}</span>
          <button type="button" onClick={drawer.dismissItemActionFeedback} aria-label="Dismiss message" className="board-drawer__banner-close">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      <div className="board-drawer__tabs" role="tablist" aria-label="Item sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`board-drawer-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={content.active_tab === tab.id}
            aria-controls="board-drawer-tabpanel"
            onClick={() => drawer.setActiveTab(tab.id)}
            className="board-drawer__tab"
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="board-drawer__tab-count">/ {tab.count}</span>}
          </button>
        ))}
      </div>

      <div
        id="board-drawer-tabpanel"
        role="tabpanel"
        aria-labelledby={`board-drawer-tab-${content.active_tab}`}
        className="board-drawer__panel"
      >
        {content.active_tab === "updates" && <UpdatesPanel drawer={content} presence={presence} show_viewers={false} />}
        {content.active_tab === "files" && <FilesPanel drawer={content} />}
        {content.active_tab === "info_boxes" && <InfoBoxesPanel info_boxes={content.info_boxes} />}
        {content.active_tab === "dependencies" && content.open_row_id && content.renderDependenciesTab?.(content.open_row_id)}
        {content.active_tab === "automations" && content.open_row_id && content.renderAutomationsTab?.(content.open_row_id)}
      </div>
    </SlideOverPanel>
  );
}

export default BoardItemDrawer;
