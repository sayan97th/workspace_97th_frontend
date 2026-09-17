"use client";
import React from "react";
import CommentComposer from "./CommentComposer";
import CommentThread from "./CommentThread";
import type { BoardItemDrawerApi, DrawerActivityEntry, DrawerComment } from "./types";

export type UpdatesPanelProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
};

type FeedEntry =
  | { kind: "comment"; sort_key: number; comment: DrawerComment }
  | { kind: "activity"; sort_key: number; entry: DrawerActivityEntry };

/** Parses `posted_at_iso`/`occurred_at_iso` into a sort key, most-recent last — mock/demo data with no raw timestamp sorts as "now" (the end of the feed), matching its "Just now" display text. */
function sortKeyOf(iso: string | undefined): number {
  if (!iso) return Date.now();
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/** The drawer's default "Updates" tab: the new-update composer, plus every comment thread interleaved chronologically with the item's activity log (column/status changes, moves, archives, ...) — folds what used to be a separate "Activity Log" tab into this single feed. */
function UpdatesPanel<TRow>({ drawer }: UpdatesPanelProps<TRow>) {
  const feed: FeedEntry[] = [
    ...drawer.comments.map((comment): FeedEntry => ({ kind: "comment", sort_key: sortKeyOf(comment.posted_at_iso), comment })),
    ...drawer.activity_log.map((entry): FeedEntry => ({ kind: "activity", sort_key: sortKeyOf(entry.occurred_at_iso), entry })),
  ].sort((a, b) => a.sort_key - b.sort_key);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-shell-border px-5 pb-3.5 pt-4">
        <CommentComposer
          target="composer"
          avatar_person={drawer.current_user}
          value={drawer.composer_text}
          onChange={drawer.onComposerTextChange}
          onSubmit={drawer.postComment}
          placeholder="Write an update... use @ to mention a teammate"
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

      <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-5 pb-10 pt-1.5">
        {drawer.comments_error && (
          <div className="mt-3 rounded-[10px] border border-[#e2445c] bg-[rgba(226,68,92,0.12)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#e2445c]">
            {drawer.comments_error}
          </div>
        )}

        {drawer.comments_loading && drawer.comments.length === 0 && (
          <div className="mt-6 text-center text-[13px] text-shell-text-faint">Loading updates…</div>
        )}

        {feed.map((entry) =>
          entry.kind === "activity" ? (
            <div key={`activity-${entry.entry.id}`} className="flex items-center gap-2.5 py-2">
              <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: entry.entry.accent_color }} />
              <div className="min-w-0 flex-1 truncate text-[12.5px] text-shell-text-faint">
                <span className="font-semibold text-shell-text-secondary">{entry.entry.actor.name}</span> {entry.entry.verb}
              </div>
              <div className="flex-none text-[11px] text-shell-text-faint">{entry.entry.occurred_at}</div>
            </div>
          ) : (
            <CommentThread
              key={entry.comment.id}
              comment={entry.comment}
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
              reply_value={drawer.reply_text_by_comment[entry.comment.id] ?? ""}
              onReplyChange={(value) => drawer.onReplyTextChange(entry.comment.id, value)}
              onPostReply={() => drawer.postReply(entry.comment.id)}
              mention_target={drawer.mention_target}
              mention_matches={drawer.mention_matches}
              onPickMention={drawer.pickMention}
              emoji_palette_target={drawer.emoji_palette_target}
              onToggleEmojiPalette={drawer.toggleEmojiPalette}
              onCloseEmojiPalette={drawer.closeEmojiPalette}
              onInsertEmoji={drawer.insertEmoji}
            />
          )
        )}
      </div>
    </div>
  );
}

export default UpdatesPanel;
