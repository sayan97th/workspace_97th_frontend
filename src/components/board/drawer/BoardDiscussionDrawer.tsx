"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { UpdatesTabIcon } from "@/icons/drawer-icons";
import { FolderPathIcon, MailIcon } from "@/icons/workspace-icons";
import CommentComposer from "./CommentComposer";
import CommentThread from "./CommentThread";
import SlideOverPanel from "./SlideOverPanel";
import type { BoardDiscussionDrawerApi } from "./useBoardDiscussionDrawer";

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
  return (
    <SlideOverPanel
      is_open={drawer.is_open}
      onClose={drawer.close}
      panel_class_name="w-[520px] max-w-[94vw] border-l border-shell-border-strong bg-shell-panel text-shell-text shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="flex flex-none items-start justify-between gap-3 border-b border-shell-border px-[22px] pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em]">Board Discussion</h2>
          <div className="mt-[7px] flex items-center gap-[7px] text-[11.5px] font-semibold text-shell-text-faint">
            <FolderPathIcon size={12} className="flex-none" />
            <span className="truncate">{drawer.breadcrumb_label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={drawer.close}
          aria-label="Close board discussion"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {/* Update-via-email / give-feedback links */}
      <div className="flex flex-none items-center gap-2.5 border-b border-shell-border px-[22px] py-3 text-[12.5px] font-semibold text-shell-text-muted">
        <span className="inline-flex items-center gap-[7px]">
          <MailIcon size={13} />
          Update via email
        </span>
        <span className="text-shell-border-strong">|</span>
        <span>Give feedback</span>
      </div>

      {/* Composer */}
      <div className="flex-none border-b border-shell-border px-5 pb-[15px] pt-4">
        <CommentComposer
          target="composer"
          avatar_person={drawer.current_user}
          value={drawer.composer_text}
          onChange={drawer.onComposerTextChange}
          onSubmit={drawer.postComment}
          placeholder="Write an update and mention others with @"
          submit_label="Update"
          variant="update"
          mention_target={drawer.mention_target}
          mention_matches={drawer.mention_matches}
          onPickMention={drawer.pickMention}
          emoji_palette_target={drawer.emoji_palette_target}
          onToggleEmojiPalette={drawer.toggleEmojiPalette}
          onCloseEmojiPalette={drawer.closeEmojiPalette}
          onInsertEmoji={drawer.insertEmoji}
          attachments={drawer.composer_attachments}
          onAddFiles={drawer.addComposerAttachments}
          onRemoveAttachment={drawer.removeComposerAttachment}
        />
      </div>

      {/* Discussion feed */}
      <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-5 pb-10 pt-1.5">
        {drawer.comments_error && (
          <div className="mt-3 rounded-[10px] border border-[#e2445c] bg-[rgba(226,68,92,0.12)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#e2445c]">
            {drawer.comments_error}
          </div>
        )}

        {drawer.comments_loading && drawer.comments.length === 0 && (
          <div className="mt-6 text-center text-[13px] text-shell-text-faint">Loading updates…</div>
        )}

        {!drawer.comments_loading && drawer.comments.length === 0 && !drawer.comments_error && (
          <div className="mx-auto flex max-w-[340px] flex-col items-center gap-3 pt-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <UpdatesTabIcon size={26} />
            </span>
            <h3 className="text-[15px] font-bold text-shell-text">No discussion on this board yet</h3>
            <p className="text-[13px] leading-relaxed text-shell-text-muted">
              Be the first one to start a discussion with all board members. If you mention someone, or a specific
              team, they will be notified.
            </p>
          </div>
        )}

        {drawer.comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            current_user={drawer.current_user}
            onToggleLike={drawer.toggleLike}
            onToggleSeen={drawer.toggleSeen}
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
            emoji_palette_target={drawer.emoji_palette_target}
            onToggleEmojiPalette={drawer.toggleEmojiPalette}
            onCloseEmojiPalette={drawer.closeEmojiPalette}
            onInsertEmoji={drawer.insertEmoji}
          />
        ))}
      </div>
    </SlideOverPanel>
  );
};

export default BoardDiscussionDrawer;
