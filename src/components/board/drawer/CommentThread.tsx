"use client";
import React, { useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { LikeIcon, ReactSmileyIcon, ReplyIcon, SeenIcon, ViewsIcon } from "@/icons/drawer-icons";
import CommentAttachmentChip from "./CommentAttachmentChip";
import CommentComposer from "./CommentComposer";
import EmojiPalette from "./EmojiPalette";
import { renderMentionText } from "./renderMentionText";
import type { DrawerComment, DrawerComposerTarget, DrawerReaction, DrawerReply } from "./types";

export type CommentThreadProps = {
  comment: DrawerComment;
  current_user: BoardPersonOption;
  onToggleLike: (comment_id: string, reply_id?: string) => void;
  onToggleSeen: (comment_id: string) => void;
  reaction_palette_id: string | null;
  onToggleReactionPalette: (id: string) => void;
  onToggleReaction: (comment_id: string, reply_id: string | null, emoji: string) => void;
  reply_value: string;
  onReplyChange: (value: string) => void;
  onPostReply: () => void;
  mention_target: DrawerComposerTarget | null;
  mention_matches: BoardPersonOption[];
  onPickMention: (person: BoardPersonOption) => void;
  emoji_palette_target: DrawerComposerTarget | null;
  onToggleEmojiPalette: (target: DrawerComposerTarget) => void;
  onInsertEmoji: (emoji: string) => void;
};

type ReactionPillsProps = {
  reactions: DrawerReaction[];
  onToggle: (emoji: string) => void;
};

const ReactionPills: React.FC<ReactionPillsProps> = ({ reactions, onToggle }) =>
  reactions.length === 0 ? null : (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold text-[#d7dcdc]"
          style={{
            background: reaction.reacted_by_me ? "rgba(87,155,252,0.18)" : "rgba(255,255,255,0.06)",
            borderColor: reaction.reacted_by_me ? "#579bfc" : "rgba(255,255,255,0.10)",
          }}
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.count}
        </button>
      ))}
    </div>
  );

type ReplyRowProps = {
  reply: DrawerReply;
  onLike: () => void;
  reaction_palette_id: string | null;
  reaction_palette_key: string;
  onToggleReactionPalette: (id: string) => void;
  onToggleReaction: (emoji: string) => void;
};

const ReplyRow: React.FC<ReplyRowProps> = ({
  reply,
  onLike,
  reaction_palette_id,
  reaction_palette_key,
  onToggleReactionPalette,
  onToggleReaction,
}) => (
  <div className="flex gap-2.5 py-3 pl-5 pr-4">
    <PersonAvatar person={reply.author} size={27} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-bold text-[#edf1f1]">{reply.author.name}</span>
        <span className="text-[11px] text-[#6e7b7d]">{reply.posted_at}</span>
      </div>
      <div className="mt-1 text-[13px] leading-[1.55] text-[#cdd5d5]">{renderMentionText(reply.body)}</div>
      <ReactionPills reactions={reply.reactions} onToggle={onToggleReaction} />
      <div className="mt-[7px] flex items-center gap-3.5">
        <button
          type="button"
          onClick={onLike}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold"
          style={{ color: reply.liked_by_me ? "#579bfc" : "#8a9495" }}
        >
          <LikeIcon size={13} filled={reply.liked_by_me} />
          Like{reply.like_count > 0 ? ` · ${reply.like_count}` : ""}
        </button>
        <span className="relative">
          <button
            type="button"
            onClick={() => onToggleReactionPalette(reaction_palette_key)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#8a9495] hover:text-[#c7d0d0]"
          >
            <ReactSmileyIcon size={13} />
            React
          </button>
          {reaction_palette_id === reaction_palette_key && (
            <EmojiPalette placement="above" onPick={onToggleReaction} />
          )}
        </span>
      </div>
    </div>
  </div>
);

/** One update thread card: the main comment, its replies, and an always-visible reply composer. */
const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  current_user,
  onToggleLike,
  onToggleSeen,
  reaction_palette_id,
  onToggleReactionPalette,
  onToggleReaction,
  reply_value,
  onReplyChange,
  onPostReply,
  mention_target,
  mention_matches,
  onPickMention,
  emoji_palette_target,
  onToggleEmojiPalette,
  onInsertEmoji,
}) => {
  const reply_composer_ref = useRef<HTMLDivElement>(null);

  const focusReplyComposer = () => reply_composer_ref.current?.querySelector("textarea")?.focus();

  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#122322]">
      <div className="px-4 pb-[13px] pt-[15px]">
        <div className="flex items-center gap-2.5">
          <PersonAvatar person={comment.author} size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-[#edf1f1]">{comment.author.name}</div>
            <div className="text-[11.5px] text-[#6e7b7d]">{comment.posted_at}</div>
          </div>
          <span className="flex items-center gap-1.5 text-[11.5px] text-[#6e7b7d]">
            <ViewsIcon />
            {comment.view_count}
          </span>
        </div>

        <div className="mt-2.5 text-[13.5px] leading-relaxed text-[#d4dbdb]">{renderMentionText(comment.body)}</div>

        {comment.attachments.length > 0 && (
          <div className="mt-[11px] flex flex-wrap gap-2">
            {comment.attachments.map((attachment) => (
              <CommentAttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <ReactionPills reactions={comment.reactions} onToggle={(emoji) => onToggleReaction(comment.id, null, emoji)} />

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleLike(comment.id)}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: comment.liked_by_me ? "#579bfc" : "#8a9495" }}
          >
            <LikeIcon filled={comment.liked_by_me} />
            Like{comment.like_count > 0 ? ` · ${comment.like_count}` : ""}
          </button>
          <span className="relative">
            <button
              type="button"
              onClick={() => onToggleReactionPalette(comment.id)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a9495] hover:text-[#c7d0d0]"
            >
              <ReactSmileyIcon />
              React
            </button>
            {reaction_palette_id === comment.id && (
              <EmojiPalette placement="above" onPick={(emoji) => onToggleReaction(comment.id, null, emoji)} />
            )}
          </span>
          <button
            type="button"
            onClick={focusReplyComposer}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a9495] hover:text-[#c7d0d0]"
          >
            <ReplyIcon />
            Reply
          </button>
          <button
            type="button"
            onClick={() => onToggleSeen(comment.id)}
            className="ml-auto flex items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: comment.seen ? "#00c875" : "#8a9495" }}
          >
            <SeenIcon />
            {comment.seen ? "Seen" : "Mark as seen"}
          </button>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="border-t border-white/[0.06] bg-black/[0.16] py-1">
          {comment.replies.map((reply) => (
            <ReplyRow
              key={reply.id}
              reply={reply}
              onLike={() => onToggleLike(comment.id, reply.id)}
              reaction_palette_id={reaction_palette_id}
              reaction_palette_key={`${comment.id}:${reply.id}`}
              onToggleReactionPalette={onToggleReactionPalette}
              onToggleReaction={(emoji) => onToggleReaction(comment.id, reply.id, emoji)}
            />
          ))}
        </div>
      )}

      <div ref={reply_composer_ref} className="border-t border-white/[0.06] py-3 pl-5 pr-4">
        <CommentComposer
          target={comment.id}
          avatar_person={current_user}
          value={reply_value}
          onChange={onReplyChange}
          onSubmit={onPostReply}
          placeholder="Write a reply and mention others with @"
          submit_label="Reply"
          variant="reply"
          mention_target={mention_target}
          mention_matches={mention_matches}
          onPickMention={onPickMention}
          emoji_palette_target={emoji_palette_target}
          onToggleEmojiPalette={onToggleEmojiPalette}
          onInsertEmoji={onInsertEmoji}
        />
      </div>
    </div>
  );
};

export default CommentThread;
