"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import PersonAvatar from "../PersonAvatar";
import { CommentCollaborationProvider } from "./CommentCollaborationContext";
import CommentComposer from "./CommentComposer";
import CommentFilterBar from "./CommentFilterBar";
import { commentAuthors, countActiveCommentFilters, default_comment_filters, filterComments, type CommentFilters } from "./commentFilters";
import CommentPresenceIndicator from "./CommentPresenceIndicator";
import CommentThread from "./CommentThread";
import ScheduledCommentsPanel from "./ScheduledCommentsPanel";
import type { BoardItemDrawerApi, DrawerActivityEntry, DrawerComment } from "./types";
import type { CommentPresenceUser } from "./useCommentPresence";

export type UpdatesPanelProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
  presence?: { presence_users: CommentPresenceUser[]; typing_names: string[]; whisperTyping: () => void };
};

/** Skips whispering "typing" on every single keystroke — one whisper per this interval is plenty for the indicator's purpose. */
const TYPING_WHISPER_THROTTLE_MS = 2000;

type FeedEntry =
  | { kind: "comment"; sort_key: number; comment: DrawerComment }
  | { kind: "activity"; sort_key: number; entry: DrawerActivityEntry };

/** Parses `posted_at_iso`/`occurred_at_iso` into a sort key, most-recent last — mock/demo data with no raw timestamp sorts as "now" (the end of the feed), matching its "Just now" display text. */
function sortKeyOf(iso: string | undefined): number {
  if (!iso) return Date.now();
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/** The drawer's default "Updates" tab: the new-update composer, plus every comment thread interleaved chronologically with the item's activity log (column/status changes, moves, archives, ...), which folds what used to be a separate "Activity Log" tab into this single feed. Pinned comments render in their own section above the chronological feed. A search and filter row narrows the threads (and hides the activity log, which has nothing to match) while any filter is on. */
function UpdatesPanel<TRow>({ drawer, presence }: UpdatesPanelProps<TRow>) {
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

  // The thread reads oldest to newest, so freshly loaded updates land at the
  // bottom: after loading them, bring that end into view.
  const showPendingUpdates = () => {
    drawer.loadPendingUpdates();
    requestAnimationFrame(() => scroll_area_ref.current?.scrollTo({ top: scroll_area_ref.current.scrollHeight, behavior: "smooth" }));
  };
  const handleComposerChange = (value: string) => {
    drawer.onComposerTextChange(value);
    const now = Date.now();
    if (presence && now - last_whisper_at_ref.current > TYPING_WHISPER_THROTTLE_MS) {
      last_whisper_at_ref.current = now;
      presence.whisperTyping();
    }
  };

  // Scheduling, assigning and the per-comment extras only exist for a real, saved item.
  const collaboration = drawer.collaboration;
  const is_api_backed = drawer.board_id !== undefined;

  const pinned_comments = visible_comments.filter((comment) => comment.pinned);
  const unpinned_comments = visible_comments.filter((comment) => !comment.pinned);

  const feed: FeedEntry[] = [
    ...unpinned_comments.map((comment): FeedEntry => ({ kind: "comment", sort_key: sortKeyOf(comment.posted_at_iso), comment })),
    ...(is_filtering ? [] : drawer.activity_log).map((entry): FeedEntry => ({ kind: "activity", sort_key: sortKeyOf(entry.occurred_at_iso), entry })),
  ].sort((a, b) => a.sort_key - b.sort_key);

  const renderThread = (comment: DrawerComment) => (
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
      fresh_comment_ids={drawer.fresh_comment_ids}
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
      onLoadRevisions={drawer.loadCommentRevisions}
      reference_items={drawer.reference_items_with_links}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-shell-border px-5 pb-3.5 pt-4">
        <CommentComposer
          target="composer"
          value={drawer.composer_text}
          onChange={handleComposerChange}
          onSubmit={drawer.postComment}
          placeholder="Write an update... use @ to mention a teammate"
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
          reference_items={drawer.reference_items_with_links}
          schedule_at={collaboration.composer_schedule_at}
          onScheduleChange={is_api_backed ? collaboration.setComposerScheduleAt : undefined}
          assignment={collaboration.composer_assignment}
          onAssignmentChange={is_api_backed && collaboration.supports_assignment && collaboration.can_edit ? collaboration.setComposerAssignment : undefined}
        />
        {is_api_backed && (
          <ScheduledCommentsPanel
            scheduled_comments={collaboration.scheduled_comments}
            onReschedule={collaboration.rescheduleComment}
            onSendNow={collaboration.sendScheduledNow}
            onCancel={collaboration.cancelScheduledComment}
          />
        )}
        {presence && <CommentPresenceIndicator presence_users={presence.presence_users} typing_names={presence.typing_names} />}
        {drawer.comments.length > 0 && (
          <CommentFilterBar
            filters={filters}
            onChange={updateFilters}
            onClear={clearFilters}
            authors={authors}
            visible_count={visible_comments.length}
            total_count={drawer.comments.length}
          />
        )}
      </div>

      <CommentCollaborationProvider value={collaboration} enabled={is_api_backed}>
      <div ref={scroll_area_ref} className="shell-scrollbar relative min-h-0 flex-1 overflow-auto px-5 pb-10 pt-1.5">
        {drawer.comments_error && (
          <div className="mt-3 rounded-[10px] border border-[#e2445c] bg-[rgba(226,68,92,0.12)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#e2445c]">
            {drawer.comments_error}
          </div>
        )}

        {drawer.comments_loading && drawer.comments.length === 0 && (
          <div className="mt-6 text-center text-[13px] text-shell-text-faint">Loading updates…</div>
        )}

        {is_filtering && visible_comments.length === 0 && drawer.comments.length > 0 && (
          <div className="mt-6 text-center text-[13px] text-shell-text-faint">No updates match these filters.</div>
        )}

        {pinned_comments.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-shell-text-faint">Pinned</div>
            {pinned_comments.map(renderThread)}
          </div>
        )}

        {feed.map((entry) =>
          entry.kind === "activity" ? (
            <div key={`activity-${entry.entry.id}`} className="flex items-center gap-2.5 py-2">
              <PersonAvatar
                person={entry.entry.actor}
                size={20}
                style={{ boxShadow: `0 0 0 2px ${entry.entry.accent_color}` }}
              />
              <div className="min-w-0 flex-1 truncate text-[12.5px] text-shell-text-faint">
                <span className="font-semibold text-shell-text-secondary">{entry.entry.actor.name}</span> {entry.entry.verb}
              </div>
              <div className="flex-none text-[11px] text-shell-text-faint">{entry.entry.occurred_at}</div>
            </div>
          ) : (
            renderThread(entry.comment)
          )
        )}

        {/* Live "N new updates" pill: sticks to the bottom edge, where the newest updates land once loaded. */}
        <div role="status" aria-live="polite" className="sticky bottom-2 z-[3] mt-3 flex justify-center">
          {drawer.pending_update_count > 0 && (
            <button
              type="button"
              onClick={showPendingUpdates}
              className="flex items-center gap-1.5 rounded-full bg-[#00c875] px-3.5 py-1.5 text-[12.5px] font-bold text-[#04241a] shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#00e084]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 2v8m0 0L2.5 6.5M6 10l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {drawer.pending_update_count} new {drawer.pending_update_count === 1 ? "update" : "updates"}
            </button>
          )}
        </div>
      </div>
      </CommentCollaborationProvider>
    </div>
  );
}

export default UpdatesPanel;
