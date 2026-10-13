"use client";
import React, { useMemo, useRef } from "react";
import { X } from "lucide-react";
import { CommentCollaborationProvider } from "@/components/board/drawer/CommentCollaborationContext";
import CommentComposer from "@/components/board/drawer/CommentComposer";
import CommentPresenceIndicator from "@/components/board/drawer/CommentPresenceIndicator";
import CommentThread from "@/components/board/drawer/CommentThread";
import ScheduledCommentsPanel from "@/components/board/drawer/ScheduledCommentsPanel";
import { sortComments } from "@/components/board/drawer/commentFilters";
import { useCommentPresence } from "@/components/board/drawer/useCommentPresence";
import type { BoardDiscussionDrawerApi } from "@/components/board/drawer/useBoardDiscussionDrawer";
import "../doc-page.css";

/** One "typing" whisper per this interval is plenty for the indicator. */
const TYPING_WHISPER_THROTTLE_MS = 2000;

/** monday's empty comments art: a gray note card and a blue update card with a smiley. */
const EmptyCommentsArt: React.FC = () => (
  <svg width="128" height="116" viewBox="0 0 128 116" fill="none" aria-hidden="true" className="doc-comments-art">
    <rect x="34" y="4" width="92" height="52" rx="6" fill="#cce5ff" />
    <path d="M100 56 L108 68 L110 56 Z" fill="#cce5ff" />
    <rect x="46" y="22" width="26" height="3" rx="1.5" fill="#323338" />
    <rect x="46" y="32" width="26" height="3" rx="1.5" fill="#323338" />
    <rect x="84" y="14" width="30" height="26" rx="3" fill="#ffffff" />
    <path d="M88 36 L96 26 L102 32 L106 28 L112 36 Z" fill="#a1c9f7" />
    <circle cx="106" cy="20" r="3" fill="#a1c9f7" />
    <rect x="2" y="48" width="72" height="62" rx="6" fill="#6161ff" />
    <rect x="12" y="62" width="46" height="3" rx="1.5" fill="#ffffff" />
    <rect x="12" y="72" width="30" height="3" rx="1.5" fill="#ffffff" />
    <rect x="12" y="82" width="38" height="3" rx="1.5" fill="#ffffff" />
    <circle cx="64" cy="100" r="11" fill="#ffcb00" />
    <path d="M59 99 Q64 105 69 99" stroke="#323338" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

export type DocCommentsPanelProps = {
  drawer: BoardDiscussionDrawerApi;
};

/**
 * The doc's "Comments" side panel, opened from the toolbar's comment button.
 * The doc's own discussion thread (the board wide updates of its navigation
 * item), styled after monday's: a composer on top, then the comments, pinned
 * ones first and newest first, with replies, reactions and edits.
 */
const DocCommentsPanel: React.FC<DocCommentsPanelProps> = ({ drawer }) => {
  const presence = useCommentPresence(drawer.is_open ? `board-discussion.${drawer.board_id}` : null, {
    onCommentPosted: drawer.onRemoteCommentPosted,
  });
  const last_whisper_at_ref = useRef(0);
  const scroll_area_ref = useRef<HTMLDivElement>(null);

  const sorted_comments = useMemo(
    () => sortComments(drawer.comments, "newest").sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [drawer.comments]
  );

  if (!drawer.is_open) return null;

  const handleComposerChange = (value: string) => {
    drawer.onComposerTextChange(value);
    const now = Date.now();
    if (now - last_whisper_at_ref.current > TYPING_WHISPER_THROTTLE_MS) {
      last_whisper_at_ref.current = now;
      presence.whisperTyping();
    }
  };

  const showPendingUpdates = () => {
    drawer.loadPendingUpdates();
    requestAnimationFrame(() => scroll_area_ref.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const is_empty = !drawer.comments_loading && drawer.comments.length === 0 && !drawer.comments_error;

  return (
    <aside className="doc-comments doc-print-hidden" aria-label="Comments">
      <div className="doc-comments-header">
        <h2 className="doc-comments-title">Comments</h2>
        <button type="button" className="doc-icon-button" onClick={drawer.close} aria-label="Close comments" title="Close">
          <X size={18} />
        </button>
      </div>

      <div ref={scroll_area_ref} className="doc-comments-scroll shell-scrollbar">
        <div className="doc-comments-composer">
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
        </div>

        <div role="status" aria-live="polite" className="sticky top-1 z-[3] flex justify-center">
          {drawer.pending_update_count > 0 && (
            <button type="button" onClick={showPendingUpdates} className="doc-comments-pending">
              {drawer.pending_update_count} new {drawer.pending_update_count === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>

        {drawer.comments_error && <div className="doc-comments-error">{drawer.comments_error}</div>}

        {drawer.comments_loading && drawer.comments.length === 0 && <div className="doc-comments-loading">Loading comments…</div>}

        {is_empty && (
          <div className="doc-comments-empty">
            <EmptyCommentsArt />
            <h3>No comments yet on this doc</h3>
            <p>Share progress, mention a teammate, or upload a file to get things moving</p>
          </div>
        )}

        <CommentCollaborationProvider value={drawer.collaboration}>
          <div className="doc-comments-list">
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
      </div>
    </aside>
  );
};

export default DocCommentsPanel;
