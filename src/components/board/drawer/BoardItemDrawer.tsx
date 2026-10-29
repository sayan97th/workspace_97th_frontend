"use client";
import React from "react";
import { GitBranch, Zap } from "lucide-react";
import { CloseIcon } from "@/icons/board-icons";
import { FilesTabIcon, InfoBoxesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import BoardDrawerHeader from "./BoardDrawerHeader";
import BoardDrawerTabs, { drawerTabId, drawerTabPanelId, type BoardDrawerTab } from "./BoardDrawerTabs";
import BoardDrawerViewers from "./BoardDrawerViewers";
import BoardItemOptionsMenu from "./BoardItemOptionsMenu";
import DrawerExpandButton from "./DrawerExpandButton";
import FilesPanel from "./FilesPanel";
import InfoBoxesPanel from "./InfoBoxesPanel";
import SlideOverPanel from "./SlideOverPanel";
import UpdatesPanel from "./UpdatesPanel";
import type { BoardItemDrawerApi, DrawerTabId } from "./types";
import { useCommentPresence } from "./useCommentPresence";
import { useDrawerExpanded } from "./useDrawerExpanded";
import { useLatchWhileOpen } from "./useLatchWhileOpen";

export type BoardItemDrawerProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
};

const TAB_ID_PREFIX = "board-item-drawer";

/**
 * Slide in item detail drawer, laid out like monday.com's item drawer: close
 * button and bold item title, the board and group it sits in, who is
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

  const { is_expanded, toggleExpanded } = useDrawerExpanded(drawer.is_open);

  if (!drawer.is_open && !content.is_open) return null;

  const tabs: BoardDrawerTab<DrawerTabId>[] = [
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
      is_expanded={is_expanded}
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
            <BoardDrawerViewers viewers={presence.presence_users} />
            <DrawerExpandButton is_expanded={is_expanded} onToggle={toggleExpanded} />
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

      <BoardDrawerTabs
        tabs={tabs}
        active_tab={content.active_tab}
        onChange={drawer.setActiveTab}
        aria_label="Item sections"
        id_prefix={TAB_ID_PREFIX}
      />

      <div
        id={drawerTabPanelId(TAB_ID_PREFIX)}
        role="tabpanel"
        aria-labelledby={drawerTabId(TAB_ID_PREFIX, content.active_tab)}
        className="board-drawer__panel"
      >
        {content.active_tab === "updates" && <UpdatesPanel drawer={content} presence={presence} show_viewers={false} composer_scrolls_with_feed />}
        {content.active_tab === "files" && <FilesPanel drawer={content} />}
        {content.active_tab === "info_boxes" && <InfoBoxesPanel info_boxes={content.info_boxes} />}
        {content.active_tab === "dependencies" && content.open_row_id && content.renderDependenciesTab?.(content.open_row_id)}
        {content.active_tab === "automations" && content.open_row_id && content.renderAutomationsTab?.(content.open_row_id)}
      </div>
    </SlideOverPanel>
  );
}

export default BoardItemDrawer;
