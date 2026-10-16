"use client";
import React from "react";
import { FilesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import { BellIcon, FolderPathIcon } from "@/icons/workspace-icons";
import BoardDrawerHeader from "./BoardDrawerHeader";
import BoardDrawerTabs, { drawerTabId, drawerTabPanelId, type BoardDrawerTab } from "./BoardDrawerTabs";
import BoardDrawerViewers from "./BoardDrawerViewers";
import DrawerExpandButton from "./DrawerExpandButton";
import FilesPanel from "./FilesPanel";
import SlideOverPanel from "./SlideOverPanel";
import UpdatesPanel from "./UpdatesPanel";
import type { BoardDiscussionDrawerApi, BoardDiscussionTabId } from "./useBoardDiscussionDrawer";
import { useCommentPresence } from "./useCommentPresence";
import { useDrawerExpanded } from "./useDrawerExpanded";

export type BoardDiscussionDrawerProps = {
  drawer: BoardDiscussionDrawerApi;
};

const TAB_ID_PREFIX = "board-discussion-drawer";

/**
 * Slide in board wide discussion drawer, opened from `BoardHeader`'s "Board
 * updates" button and driven entirely by {@link useBoardDiscussionDrawer}.
 * Laid out exactly like `BoardItemDrawer`: close button and title, the board
 * breadcrumb, who is viewing it, the full screen toggle, then the Updates and
 * Files tabs built from the same `UpdatesPanel` and `FilesPanel`. Only the
 * data differs, this thread belongs to the whole board instead of one item.
 *
 * Renders unconditionally (no early `is_open` return): `SlideOverPanel`
 * itself stays mounted for one extra transition tick after `is_open` flips
 * to `false` so the close has something to animate, and the board's thread
 * simply keeps showing its last loaded value while the panel slides away.
 */
const BoardDiscussionDrawer: React.FC<BoardDiscussionDrawerProps> = ({ drawer }) => {
  // Bare name (no `presence-` prefix): `Echo.join()` prepends that itself,
  // matching `Broadcast::channel('presence-board-discussion.{id}', ...)`.
  const presence = useCommentPresence(drawer.is_open ? `board-discussion.${drawer.board_id}` : null, {
    onCommentPosted: drawer.onRemoteCommentPosted,
  });
  const { is_expanded, toggleExpanded } = useDrawerExpanded(drawer.is_open);
  const mute_label = drawer.is_muted ? "Unmute this board's notifications" : "Mute this board's notifications";

  const tabs: BoardDrawerTab<BoardDiscussionTabId>[] = [
    { id: "updates", label: "Updates", icon: <UpdatesTabIcon size={16} />, count: drawer.comments.length },
    { id: "files", label: "Files", icon: <FilesTabIcon size={16} />, count: drawer.all_attachments.length },
  ];

  return (
    <SlideOverPanel
      is_open={drawer.is_open}
      onClose={drawer.close}
      aria_label="Board discussion"
      panel_class_name="w-[clamp(560px,48vw,880px)]"
      is_expanded={is_expanded}
    >
      <BoardDrawerHeader
        title="Board Discussion"
        title_size="page"
        close_position="start"
        close_label="Close board discussion"
        onClose={drawer.close}
        eyebrow={
          <>
            <FolderPathIcon size={13} className="flex-none" />
            <span className="board-drawer__eyebrow-text">{drawer.breadcrumb_label}</span>
          </>
        }
        actions={
          <>
            <BoardDrawerViewers viewers={presence.presence_users} />
            <button
              type="button"
              onClick={drawer.toggleMute}
              aria-label={mute_label}
              aria-pressed={drawer.is_muted}
              title={mute_label}
              className="board-drawer__icon-button"
            >
              <BellIcon size={17} />
            </button>
            <DrawerExpandButton is_expanded={is_expanded} onToggle={toggleExpanded} />
          </>
        }
      />

      <BoardDrawerTabs
        tabs={tabs}
        active_tab={drawer.active_tab}
        onChange={drawer.setActiveTab}
        aria_label="Board discussion sections"
        id_prefix={TAB_ID_PREFIX}
      />

      <div
        id={drawerTabPanelId(TAB_ID_PREFIX)}
        role="tabpanel"
        aria-labelledby={drawerTabId(TAB_ID_PREFIX, drawer.active_tab)}
        className="board-drawer__panel"
      >
        {drawer.active_tab === "updates" && (
          <UpdatesPanel
            drawer={drawer}
            presence={presence}
            show_viewers={false}
            composer_scrolls_with_feed
            // A discussion reads newest first by default.
            sort_storage_key="board-discussion"
            default_sort_order="newest"
            empty_title="No discussion on this board yet"
            empty_text="Be the first one to start a discussion with all board members. If you mention someone, or a specific team, they will be notified."
          />
        )}
        {drawer.active_tab === "files" && (
          <FilesPanel
            drawer={drawer}
            empty_text="Drag and drop files anywhere on this panel, or browse to share the first one with everyone on this board."
          />
        )}
      </div>
    </SlideOverPanel>
  );
};

export default BoardDiscussionDrawer;
