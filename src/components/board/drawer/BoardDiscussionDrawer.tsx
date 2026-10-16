"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { UpdatesTabIcon } from "@/icons/drawer-icons";
import { BellIcon, FolderPathIcon } from "@/icons/workspace-icons";
import { CommentCollaborationProvider } from "./CommentCollaborationContext";
import CommentComposer from "./CommentComposer";
import BoardDrawerHeader from "./BoardDrawerHeader";
import CommentFilterBar from "./CommentFilterBar";
import { commentAuthors, countActiveCommentFilters, countResolvedComments, default_comment_filters, filterComments, sortComments, type CommentFilters } from "./commentFilters";
import CommentPresenceIndicator from "./CommentPresenceIndicator";
import CommentThread from "./CommentThread";
import { useCommentSortOrder } from "./useCommentSortOrder";
import ScheduledCommentsPanel from "./ScheduledCommentsPanel";
import SlideOverPanel from "./SlideOverPanel";
import type { BoardDiscussionDrawerApi } from "./useBoardDiscussionDrawer";
import { useCommentPresence } from "./useCommentPresence";

/** Skips whispering "typing" on every single keystroke — one whisper per this interval is plenty for the indicator's purpose. */
const TYPING_WHISPER_THROTTLE_MS = 2000;

export type BoardDiscussionDrawerProps = {
  drawer: BoardDiscussionDrawerApi;
};

/**
 * Slide-in board-wide discussion drawer, opened from `BoardHeader`'s "Board
 * updates" button — the board-level counterpart to `BoardItemDrawer`'s
 * per-row Updates tab, driven entirely by {@link useBoardDiscussionDrawer}.
 */
/**
 * Renders unconditionally (no early `is_open` return) — `SlideOverPanel`
 * itself stays mounted for one extra transition tick after `is_open` flips
 * to `false` so the close has something to animate; bailing out here first
 * would unmount it immediately and skip that animation. There is no
 * per-row "content" to latch through the close the way `BoardItemDrawer`
 * needs to, since this drawer's `comments` list is already flat and simply
 * keeps showing its last-loaded value while the panel slides away.
 */
const BoardDiscussionDrawer: React.FC<BoardDiscussionDrawerProps> = ({ drawer }) => {
  // Bare name (no `presence-` prefix): `Echo.join()` prepends that itself,
  // matching `Broadcast::channel('presence-board-discussion.{id}', ...)`.
  const presence = useCommentPresence(drawer.is_open ? `board-discussion.${drawer.board_id}` : null, {
    onCommentPosted: drawer.onRemoteCommentPosted,
  });
  const last_whisper_at_ref = useRef(0);
  const scroll_area_ref = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<CommentFilters>(default_comment_filters);
  const updateFilters = useCallback((patch: Partial<CommentFilters>) => setFilters((previous) => ({ ...previous, ...patch })), []);
  const clearFilters = useCallback(() => setFilters(default_comment_filters), []);
  const is_filtering = countActiveCommentFilters(filters) > 0;
  const visible_comments = useMemo(
    () => filterComments(drawer.comments, filters, drawer.current_user.id),
    [drawer.comments, filters, drawer.current_user.id]
  );
  const authors = useMemo(() => commentAuthors(drawer.comments), [drawer.comments]);
  const resolved_count = useMemo(() => countResolvedComments(drawer.comments), [drawer.comments]);
  // A discussion reads newest first by default, the choice is remembered in this browser.
  const { sort_order, setSortOrder } = useCommentSortOrder("board-discussion", "newest");
  const sorted_comments = useMemo(
    () => sortComments(visible_comments, sort_order).sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [visible_comments, sort_order]
  );

  // Freshly loaded updates land at the top when the thread reads newest first and
  // at the bottom when oldest first: after loading them, bring that end into view.
  const showPendingUpdates = () => {
    drawer.loadPendingUpdates();
    requestAnimationFrame(() =>
      scroll_area_ref.current?.scrollTo({ top: sort_order === "newest" ? 0 : scroll_area_ref.current.scrollHeight, behavior: "smooth" })
    );
  };
  const handleComposerChange = (value: string) => {
    drawer.onComposerTextChange(value);
    const now = Date.now();
    if (now - last_whisper_at_ref.current > TYPING_WHISPER_THROTTLE_MS) {
      last_whisper_at_ref.current = now;
      presence.whisperTyping();
    }
  };

  return (
    <SlideOverPanel
      is_open={drawer.is_open}
      onClose={drawer.close}
      aria_label="Board discussion"
      panel_class_name="w-[min(600px,100vw)]"
    >
      <BoardDrawerHeader
        title="Board Discussion"
        onClose={drawer.close}
        close_label="Close board discussion"
        is_bordered
        eyebrow={
          <>
            <FolderPathIcon size={13} className="flex-none" />
            <span className="board-drawer__eyebrow-text">{drawer.breadcrumb_label}</span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={drawer.toggleMute}
            aria-label={drawer.is_muted ? "Unmute this board's notifications" : "Mute this board's notifications"}
            aria-pressed={drawer.is_muted}
            title={drawer.is_muted ? "Unmute this board's notifications" : "Mute this board's notifications"}
            className="board-drawer__icon-button"
          >
            <BellIcon size={17} />
          </button>
        }
      />

      {/* Composer */}
      <div className="board-drawer__composer-area">
        <CommentComposer
          target="composer"
          value={drawer.composer_text}
          onChange={handleComposerChange}
          onSubmit={drawer.postComment}
          placeholder="Write an update and mention others with @"
          submit_label="Update"
          variant="update"
          mention_target={drawer.mention_target}
          mention_matches={drawer.mention_matches}
          onPickMention={drawer.pickMention}
          mentionable_people={drawer.mentionable_people}
          notify_target={drawer.notify_target}
          onToggleNotifyPicker={drawer.toggleNotifyPicker}
          onCloseNotifyPicker={drawer.closeNotifyPicker}
          onPickNotifyPerson={drawer.pickNotifyPerson}
          notified_people={drawer.notified_people_by_target.composer ?? []}
          onRemoveNotifyPerson={(person_id) => drawer.removeNotifyPerson("composer", person_id)}
          emoji_palette_target={drawer.emoji_palette_target}
          onToggleEmojiPalette={drawer.toggleEmojiPalette}
          onCloseEmojiPalette={drawer.closeEmojiPalette}
          onInsertEmoji={drawer.insertEmoji}
          attachments={drawer.composer_attachments}
          onAddFiles={drawer.addComposerAttachments}
          onRemoveAttachment={drawer.removeComposerAttachment}
          schedule_at={drawer.collaboration.composer_schedule_at}
          onScheduleChange={drawer.collaboration.setComposerScheduleAt}
        />
        <ScheduledCommentsPanel
          scheduled_comments={drawer.collaboration.scheduled_comments}
          onReschedule={drawer.collaboration.rescheduleComment}
          onSendNow={drawer.collaboration.sendScheduledNow}
          onCancel={drawer.collaboration.cancelScheduledComment}
        />
        <CommentPresenceIndicator presence_users={presence.presence_users} typing_names={presence.typing_names} />
        {drawer.comments.length > 0 && (
          <CommentFilterBar
            filters={filters}
            onChange={updateFilters}
            onClear={clearFilters}
            authors={authors}
            visible_count={visible_comments.length}
            total_count={drawer.comments.length}
            resolved_count={resolved_count}
            sort_order={sort_order}
            onSortChange={setSortOrder}
          />
        )}
      </div>

      {/* Discussion feed */}
      <CommentCollaborationProvider value={drawer.collaboration}>
      <div ref={scroll_area_ref} className="shell-scrollbar board-drawer__scroll">
        {/* Live "N new updates" pill: sticks to the top edge, where the newest updates land once loaded. */}
        <div role="status" aria-live="polite" className="sticky top-1 z-[3] flex justify-center">
          {drawer.pending_update_count > 0 && (
            <button type="button" onClick={showPendingUpdates} className="board-drawer__pill mt-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 10V2m0 0L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {drawer.pending_update_count} new {drawer.pending_update_count === 1 ? "update" : "updates"}
            </button>
          )}
        </div>

        {drawer.comments_error && (
          <div role="alert" className="board-drawer__error">
            {drawer.comments_error}
          </div>
        )}

        {drawer.comments_loading && drawer.comments.length === 0 && (
          <div className="board-drawer__status-text">Loading updates...</div>
        )}

        {!drawer.comments_loading && drawer.comments.length === 0 && !drawer.comments_error && (
          <div className="board-drawer__empty">
            <span className="board-drawer__empty-icon">
              <UpdatesTabIcon size={26} />
            </span>
            <h3 className="board-drawer__empty-title">No discussion on this board yet</h3>
            <p className="board-drawer__empty-text">
              Be the first one to start a discussion with all board members. If you mention someone, or a specific
              team, they will be notified.
            </p>
          </div>
        )}

        {is_filtering && visible_comments.length === 0 && drawer.comments.length > 0 && (
          <div className="board-drawer__status-text">No updates match these filters.</div>
        )}

        {sorted_comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              current_user={drawer.current_user}
              onToggleLike={drawer.toggleLike}
              onToggleSeen={drawer.toggleSeen}
              onTogglePin={drawer.togglePin}
              onDeleteComment={drawer.deleteComment}
              editing_key={drawer.editing_key}
              edit_draft={drawer.edit_draft}
              onEditDraftChange={drawer.onEditDraftChange}
              onStartEditing={drawer.startEditingComment}
              onCancelEditing={drawer.cancelEditingComment}
              onSaveEditing={drawer.saveEditedComment}
              edit_attachments={drawer.edit_attachments}
              onAddEditAttachments={drawer.addEditAttachments}
              onRemoveEditAttachment={drawer.removeEditAttachment}
              reaction_palette_id={drawer.reaction_palette_id}
              onToggleReactionPalette={drawer.toggleReactionPalette}
              onCloseReactionPalette={drawer.closeReactionPalette}
              onToggleReaction={drawer.toggleReaction}
              reply_value={drawer.reply_text_by_comment[comment.id] ?? ""}
              onReplyChange={(value) => drawer.onReplyTextChange(comment.id, value)}
              onPostReply={() => drawer.postReply(comment.id)}
              mention_target={drawer.mention_target}
              mention_matches={drawer.mention_matches}
              onPickMention={drawer.pickMention}
              mentionable_people={drawer.mentionable_people}
              notify_target={drawer.notify_target}
              onToggleNotifyPicker={drawer.toggleNotifyPicker}
              onCloseNotifyPicker={drawer.closeNotifyPicker}
              onPickNotifyPerson={drawer.pickNotifyPerson}
              notified_people={drawer.notified_people_by_target[comment.id] ?? []}
              onRemoveNotifyPerson={drawer.removeNotifyPerson}
              emoji_palette_target={drawer.emoji_palette_target}
              onToggleEmojiPalette={drawer.toggleEmojiPalette}
              onCloseEmojiPalette={drawer.closeEmojiPalette}
              onInsertEmoji={drawer.insertEmoji}
              fresh_comment_ids={drawer.fresh_comment_ids}
              onLoadRevisions={drawer.loadCommentRevisions}
            />
          ))}
      </div>
      </CommentCollaborationProvider>
    </SlideOverPanel>
  );
};

export default BoardDiscussionDrawer;
