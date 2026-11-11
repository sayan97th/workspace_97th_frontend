"use client";
import React, { useState } from "react";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import EmojiPalette from "@/components/board/drawer/EmojiPalette";
import LikeButton from "@/components/board/drawer/LikeButton";
import ReactionPill from "@/components/board/drawer/ReactionPill";
import ReactionsSummary from "@/components/board/drawer/ReactionsSummary";
import RichTextContent from "@/components/board/drawer/RichTextContent";
import ThreadReply, {
  ThreadReplyAction,
  ThreadReplyBody,
  ThreadReplyButton,
  ThreadReplyViews,
  thread_reply_action_class,
} from "@/components/board/drawer/ThreadReply";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import { LinkIcon } from "@/icons/workspace-icons";
import type { FeedUpdate } from "@/data/update-feed-data";

type FeedThreadReplyProps = {
  reply: FeedUpdate;
  current_user: BoardPersonOption;
  /** Toggles the viewer's like on this reply. */
  onLike?: (id: string) => void;
  /** Toggles the viewer's reaction with `emoji` on this reply. */
  onReact?: (id: string, emoji: string) => void;
  /** Reply under the bubble: answers the thread and `@mentions` this reply's author. */
  onReplyTo: () => void;
};

/** "Nov 10, 2026, 3:42 PM", the full date behind a relative time. */
const formatFullDate = (iso: string): string | undefined => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * One reply inline under its update on an Update Feed (Inbox) card, in the
 * same monday bubble the item drawer uses: name, time and message in a soft
 * bubble, emoji pills inside it, then views, Like, React, "Edited" and Reply
 * underneath. An unread reply gets a blue dot and a soft blue tint until the
 * card is read.
 */
const FeedThreadReply: React.FC<FeedThreadReplyProps> = ({ reply, current_user, onLike, onReact, onReplyTo }) => {
  // The React button, or the "+" once the reply has reactions, whichever opened the emoji palette.
  const [palette_anchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  const [link_copied, setLinkCopied] = useState(false);

  const { actor } = reply;
  const author: BoardPersonOption = {
    id: actor.id ?? "0",
    name: actor.name,
    initials: actor.initials,
    avatar_seed: actor.avatar_seed,
    avatar_url: actor.avatar_url,
    is_deactivated: actor.id ? actor.is_deactivated : true,
  };
  const has_reactions = reply.reactions.length > 0;
  const has_reaction_row = has_reactions || reply.like_count > 0;

  const togglePalette = (event: React.MouseEvent<HTMLElement>) => {
    const trigger = event.currentTarget;
    setPaletteAnchor((current) => (current === trigger ? null : trigger));
  };
  const react = (emoji: string) => {
    setPaletteAnchor(null);
    onReact?.(reply.id, emoji);
  };

  const copyLink = () => {
    if (!reply.link) return;
    navigator.clipboard.writeText(`${window.location.origin}${reply.link}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  };

  return (
    <>
      <ThreadReply
        dom_id={`feed-reply-${reply.id}`}
        author={author}
        has_profile={Boolean(actor.id)}
        time_label={reply.date_label}
        time_title={formatFullDate(reply.created_at)}
        is_unread={reply.is_unread}
        menu={
          reply.link ? (
            <ThreadReplyAction
              onClick={copyLink}
              aria-label="Copy link to this reply"
              title={link_copied ? "Link copied!" : "Copy link to this reply"}
            >
              <LinkIcon size={13} />
            </ThreadReplyAction>
          ) : undefined
        }
        reactions={
          has_reaction_row ? (
            <>
              {reply.reactions.map((reaction) => (
                <ReactionPill
                  key={reaction.emoji}
                  reaction={reaction}
                  source={reply}
                  current_user={current_user}
                  onToggle={() => onReact?.(reply.id, reaction.emoji)}
                />
              ))}
              {has_reactions && onReact && (
                <button
                  type="button"
                  onClick={togglePalette}
                  aria-label="Add another reaction"
                  aria-expanded={palette_anchor !== null && palette_anchor.dataset.trigger === "add"}
                  data-trigger="add"
                  title="Add another reaction"
                  className="feed-card__add-reaction"
                >
                  <ReactSmileyIcon size={13} />
                </button>
              )}
              <ReactionsSummary source={reply} current_user={current_user} />
            </>
          ) : undefined
        }
        footer={
          <>
            {typeof reply.view_count === "number" && <ThreadReplyViews count={reply.view_count} />}
            <LikeButton
              entry={reply}
              current_user={current_user}
              onToggle={() => onLike?.(reply.id)}
              class_name={thread_reply_action_class}
              icon_size={15}
              compact
            />
            {!has_reactions && onReact && (
              <ThreadReplyAction
                onClick={togglePalette}
                aria-expanded={palette_anchor !== null && palette_anchor.dataset.trigger === "react"}
                data-trigger="react"
                aria-label="React"
                title="React"
              >
                <ReactSmileyIcon size={15} />
              </ThreadReplyAction>
            )}
            {reply.edited_at && (
              <span className="thread-reply__edited" title={`Edited ${formatFullDate(reply.edited_at) ?? ""}`.trim()}>
                Edited
              </span>
            )}
            <ThreadReplyButton author_name={actor.name} onClick={onReplyTo} />
          </>
        }
      >
        <ThreadReplyBody>
          <RichTextContent html={reply.body} people={reply.mentions} />
        </ThreadReplyBody>
      </ThreadReply>
      <EmojiPalette anchor_el={palette_anchor} is_open={palette_anchor !== null} onClose={() => setPaletteAnchor(null)} onPick={react} mode="react" />
    </>
  );
};

export default FeedThreadReply;
