"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import PersonAvatar from "@/components/board/PersonAvatar";
import BrandLogo from "@/components/common/BrandLogo";
import RichTextContent from "@/components/board/drawer/RichTextContent";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import FeedActivityTimeline from "@/components/feed/FeedActivityTimeline";
import FeedReplyComposer, { type FeedReplyComposerRef } from "@/components/feed/FeedReplyComposer";
import FeedThreadReply from "@/components/feed/FeedThreadReply";
import { useFoldedReplies } from "@/components/board/drawer/useFoldedReplies";
import { isThreadUnread } from "@/hooks/feedThreads";
import type { FeedActor } from "@/data/update-feed-data";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import { loadFeedBoardPeople, loadFeedBoardTeams } from "@/lib/feed-people";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import DeactivatedBadge from "@/components/board/DeactivatedBadge";
import EmojiPalette from "@/components/board/drawer/EmojiPalette";
import LikeButton from "@/components/board/drawer/LikeButton";
import ReactionPill from "@/components/board/drawer/ReactionPill";
import ReactionsSummary from "@/components/board/drawer/ReactionsSummary";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import CopyLinkModal from "@/components/ui/modal/CopyLinkModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import {
  BellIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DeleteIcon,
  LinkIcon,
  MailIcon,
  MoreDotsIcon,
  PencilIcon,
  ReplyIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import { feed_reply_placeholder, type FeedUpdate } from "@/data/update-feed-data";
import "@/components/board/drawer/thread-reply.scss";
import "./update-feed-card.scss";

type UpdateFeedCardProps = {
  update: FeedUpdate;
  /** The signed-in user, shown beside the reply box. */
  current_user: BoardPersonOption;
  /** Fired when the Like action is pressed on the update or one of its replies (`id` says which), toggles the viewer's like. */
  onLike?: (id: string) => void;
  /** Fired when an emoji is picked or a reaction pill is clicked, on the update or one of its replies. */
  onReact?: (id: string, emoji: string) => void;
  /** Fired by the one click bookmark in the header ("Save for later") and the menu's "Bookmark this update to inbox". */
  onBookmark?: (id: string) => void;
  /** Fired when a reply is submitted from the inline composer, with the ids of everyone it `@mentions`. */
  onReply?: (id: string, body: string, mentioned_user_ids: number[]) => void;
  /** Fired by the blue check beside the card: reads the thread when it is unread, brings it back as unread otherwise. */
  onToggleRead?: (id: string, is_unread: boolean) => void;
  /** Fired by the bell: subscribes to (or leaves) the update's item, or its board for a board update. */
  onFollow?: (type: "board" | "item", id: number, following: boolean) => void;
  /** Fired by the menu's "Edit update" once the new body is saved. */
  onEdit?: (id: string, body: string) => Promise<void>;
  /** Fired by the menu's "Delete update for everyone". */
  onDelete?: (id: string) => void;
  /** Fired when the breadcrumb opens the item, so the inbox can close. */
  onNavigate?: () => void;
};

/** Height past which the body folds behind "Read More", as in monday.com. */
const BODY_FOLD_HEIGHT_PX = 280;

/** "Nov 10, 2026, 3:42 PM", the full date behind the short time. */
const formatFullDate = (iso: string): string | undefined => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/** monday's compact age: "now", "5m", "3h", "24d", "2mo", "1y". */
export const formatShortAge = (iso: string, now: number = Date.now()): string => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
};

/**
 * One thread in the Update feed (Inbox), laid out like monday.com: the
 * author's avatar and name over the board breadcrumb, the age, a bell to
 * subscribe to the item and the "..." menu on the right, the message (folded
 * behind "Read More" when long), reactions with the "N Seen" count, the
 * Like | Reply bar, every reply inline in soft bubbles and the reply box.
 * Beside the card sits the big blue check that marks the thread as read.
 * Backed by real `BoardItemComment` / `BoardComment` rows via `useFeedUpdates`.
 */
const UpdateFeedCard: React.FC<UpdateFeedCardProps> = ({
  update,
  current_user,
  onLike,
  onReact,
  onBookmark,
  onReply,
  onToggleRead,
  onFollow,
  onEdit,
  onDelete,
  onNavigate,
}) => {
  const {
    id,
    actor,
    breadcrumb,
    body,
    mentions,
    board_id,
    view_count,
    is_bookmarked,
    item_id,
    is_following_item,
    is_following_board,
    activity,
    activity_total,
    link,
    show_actions,
    show_composer,
    replies,
  } = update;

  const { success: toastSuccess } = useToast();
  const is_thread_unread = isThreadUnread(update);
  const is_own = actor.id !== undefined && actor.id === current_user.id;
  const is_following = item_id ? is_following_item : is_following_board;

  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_share_open, setIsShareOpen] = useState(false);
  const [is_editing, setIsEditing] = useState(false);
  const [is_composer_open, setIsComposerOpen] = useState(false);
  const [is_body_expanded, setIsBodyExpanded] = useState(false);
  const [is_body_long, setIsBodyLong] = useState(false);
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const body_ref = useRef<HTMLDivElement>(null);
  const reply_composer_ref = useRef<HTMLDivElement>(null);
  const reply_box_ref = useRef<FeedReplyComposerRef>(null);
  // The "+" or the reactions smiley, whichever opened the emoji palette.
  const [palette_anchor, setPaletteAnchor] = useState<HTMLElement | null>(null);

  // A long body folds behind "Read More". Re-measured when images load or the width changes.
  useLayoutEffect(() => {
    const node = body_ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => setIsBodyLong(node.scrollHeight > BODY_FOLD_HEIGHT_PX + 24);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [body, is_editing]);

  // The reply box is opened by Reply, and a reply under a reply opens it too.
  const openComposer = () => {
    setIsComposerOpen(true);
    requestAnimationFrame(() => {
      reply_box_ref.current?.focus();
      reply_composer_ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  // Reply under a reply answers this same thread and `@mentions` the reply's author, as in monday.
  const replyTo = (person: FeedActor) => {
    setIsComposerOpen(true);
    requestAnimationFrame(() => {
      if (person.id && person.id !== current_user.id) {
        reply_box_ref.current?.mentionPerson({ id: person.id, name: person.name });
      } else {
        reply_box_ref.current?.focus();
      }
      reply_composer_ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  // A long thread keeps its newest replies in view, an unread one is never folded away.
  const folded_replies = useFoldedReplies(
    replies,
    new Set(replies.filter((reply) => reply.is_unread).map((reply) => reply.id))
  );

  const absolute_link = link && typeof window !== "undefined" ? `${window.location.origin}${link}` : "";

  const copyLink = () => {
    if (!absolute_link) return;
    navigator.clipboard.writeText(absolute_link).then(() => toastSuccess("Link copied to clipboard"));
  };

  const toggleFollow = () => {
    if (item_id) onFollow?.("item", Number(item_id), !is_following_item);
    else onFollow?.("board", Number(board_id), !is_following_board);
  };

  const saveEdit = async (next_body: string) => {
    await onEdit?.(id, next_body);
    setIsEditing(false);
  };

  const menu_sections: ActionMenuSection[] = [
    {
      key: "update",
      items: [
        { key: "copy", label: "Copy link to update", icon: <LinkIcon size={16} />, onClick: copyLink, disabled: !link },
        {
          key: "edit",
          label: "Edit update",
          icon: <PencilIcon size={16} />,
          onClick: () => setIsEditing(true),
          disabled: !is_own || !onEdit,
          disabled_reason: "Only the author can edit this update",
        },
        {
          key: "delete",
          label: "Delete update for everyone",
          icon: <DeleteIcon size={16} />,
          onClick: () => onDelete?.(id),
          disabled: !is_own || !onDelete,
          disabled_reason: "Only the author can delete this update",
        },
        { key: "share", label: "Share update", icon: <MailIcon size={16} />, onClick: () => setIsShareOpen(true), disabled: !link },
        {
          key: "bookmark",
          label: is_bookmarked ? "Remove bookmark" : "Bookmark this update to inbox",
          icon: <BookmarkIcon size={16} filled={is_bookmarked} />,
          onClick: () => onBookmark?.(id),
        },
      ],
    },
  ];

  const has_reactions = update.reactions.length > 0;
  const has_views = typeof view_count === "number" && view_count > 0;

  const togglePalette = (event: React.MouseEvent<HTMLElement>) => {
    const trigger = event.currentTarget;
    setPaletteAnchor((current) => (current === trigger ? null : trigger));
  };
  const react = (emoji: string) => {
    setPaletteAnchor(null);
    onReact?.(id, emoji);
  };

  const author_person = { id: actor.id ?? "0", name: actor.name, avatar_url: actor.avatar_url, is_deactivated: actor.id ? actor.is_deactivated : true };
  const short_age = formatShortAge(update.created_at);

  return (
    <div className="uf-row">
      <article className="uf-card" data-unread={is_thread_unread ? "true" : undefined} aria-label={`Update by ${actor.name}`}>
        {/* Header: avatar, name, breadcrumb, age, bell and menu */}
        <header className="uf-card__header">
          {actor.is_system ? (
            <span className="uf-card__system-avatar" aria-hidden="true">
              <BrandLogo size={20} />
            </span>
          ) : actor.id ? (
            <PersonHoverCard person={author_person} className="flex-none">
              <PersonAvatar person={{ ...actor, id: actor.id }} size={32} />
            </PersonHoverCard>
          ) : (
            <PersonAvatar person={{ ...actor, id: "0", is_deactivated: true }} size={32} />
          )}

          <div className="uf-card__heading">
            <div className="uf-card__author">
              {actor.is_system ? (
                <span className="uf-card__name">{actor.name}</span>
              ) : actor.id ? (
                <PersonHoverCard person={author_person}>
                  <span className={`uf-card__name ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</span>
                </PersonHoverCard>
              ) : (
                <span className={`uf-card__name ${getDeactivatedClass(true)}`}>{actor.name}</span>
              )}
              {!actor.is_system && <DeactivatedBadge is_deactivated={actor.id ? actor.is_deactivated : false} />}
            </div>
            <nav className="uf-card__breadcrumb" aria-label="Where this update lives">
              {breadcrumb.crumbs.map((crumb, index) => {
                const is_last = index === breadcrumb.crumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb}-${index}`}>
                    {is_last && link ? (
                      <Link href={link} onClick={onNavigate} className="uf-card__crumb uf-card__crumb--link">
                        {crumb}
                      </Link>
                    ) : (
                      <span className="uf-card__crumb">{crumb}</span>
                    )}
                    {!is_last && <ChevronRightIcon size={9} className="uf-card__crumb-separator" />}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          <div className="uf-card__tools">
            <span className="uf-card__age" title={formatFullDate(update.created_at)}>
              <ClockIcon size={13} />
              {short_age}
            </span>
            {show_actions && onFollow && (
              <button
                type="button"
                onClick={toggleFollow}
                aria-pressed={is_following}
                aria-label={is_following ? "Stop getting updates on this item" : "Get updates on this item"}
                title={is_following ? "You are subscribed to this item. Click to unsubscribe" : "Subscribe to this item"}
                className="uf-card__tool"
                data-active={is_following ? "true" : undefined}
              >
                <BellIcon size={15} />
              </button>
            )}
            {show_actions && onBookmark && (
              <button
                type="button"
                onClick={() => onBookmark(id)}
                aria-pressed={is_bookmarked}
                aria-label={is_bookmarked ? "Remove from saved" : "Save for later"}
                title={is_bookmarked ? "Saved in Bookmarked. Click to remove" : "Save for later"}
                className="uf-card__tool uf-card__tool--bookmark"
                data-active={is_bookmarked ? "true" : undefined}
              >
                <BookmarkIcon size={15} filled={is_bookmarked} />
              </button>
            )}
            {show_actions && (
              <>
                <button
                  ref={menu_trigger_ref}
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={is_menu_open}
                  aria-label="Update options"
                  className="uf-card__tool"
                >
                  <MoreDotsIcon size={15} />
                </button>
                <ActionMenu
                  anchor_el={menu_trigger_ref.current}
                  is_open={is_menu_open}
                  onClose={() => setIsMenuOpen(false)}
                  sections={menu_sections}
                  aria_label="Update options"
                  width={272}
                  align="end"
                />
              </>
            )}
          </div>
        </header>

        {/* Message, folded behind Read More when long, or the edit box */}
        <div className="uf-card__content">
          {is_editing ? (
            <FeedReplyComposer
              current_user={current_user}
              loadPeople={() => loadFeedBoardPeople(board_id)}
              loadTeams={() => loadFeedBoardTeams(board_id)}
              onSubmit={(next_body) => void saveEdit(next_body)}
              onCancel={() => setIsEditing(false)}
              initial_value={body}
              submit_label="Save"
              placeholder="Edit your update..."
              auto_focus
              hide_avatar
            />
          ) : (
            <>
              <div
                ref={body_ref}
                className="uf-card__body"
                data-folded={is_body_long && !is_body_expanded ? "true" : undefined}
                style={{ "--uf-fold-height": `${BODY_FOLD_HEIGHT_PX}px` } as React.CSSProperties}
              >
                <RichTextContent html={body} people={mentions} />
                <FeedActivityTimeline entries={activity} total={activity_total} />
              </div>
              {is_body_long && (
                <button type="button" onClick={() => setIsBodyExpanded((expanded) => !expanded)} className="uf-card__read-more" aria-expanded={is_body_expanded}>
                  {is_body_expanded ? "Read Less" : "Read More"}
                  <ChevronDownIcon size={13} className={is_body_expanded ? "rotate-180" : undefined} />
                </button>
              )}
            </>
          )}

          {/* Reactions and the "N Seen" count */}
          {(show_actions || has_views) && (
            <div className="uf-card__meta">
              <div className="uf-card__reactions">
                {show_actions &&
                  update.reactions.map((reaction) => (
                    <ReactionPill
                      key={reaction.emoji}
                      reaction={reaction}
                      source={update}
                      current_user={current_user}
                      onToggle={() => onReact?.(id, reaction.emoji)}
                    />
                  ))}
                {show_actions && onReact && (
                  <button
                    type="button"
                    onClick={togglePalette}
                    aria-label={has_reactions ? "Add another reaction" : "React"}
                    aria-expanded={palette_anchor !== null}
                    title={has_reactions ? "Add another reaction" : "React"}
                    className="uf-card__add-reaction"
                    data-empty={has_reactions ? undefined : "true"}
                  >
                    <ReactSmileyIcon size={13} />
                  </button>
                )}
                {show_actions && (has_reactions || update.like_count > 0) && <ReactionsSummary source={update} current_user={current_user} />}
              </div>
              {has_views && (
                <span className="uf-card__seen" title={`Seen by ${view_count}`}>
                  <ViewsIcon size={14} />
                  {view_count} Seen
                </span>
              )}
            </div>
          )}
        </div>

        {/* Like | Reply */}
        {show_actions && (
          <div className="uf-card__actions">
            <LikeButton entry={update} current_user={current_user} onToggle={() => onLike?.(id)} class_name="uf-card__action" />
            <button type="button" onClick={openComposer} className="uf-card__action" aria-expanded={is_composer_open}>
              <ReplyIcon size={14} />
              Reply
            </button>
          </div>
        )}
        <EmojiPalette anchor_el={palette_anchor} is_open={palette_anchor !== null} onClose={() => setPaletteAnchor(null)} onPick={react} mode="react" />

        {/* Replies, inline under the update like monday's inbox */}
        {replies.length > 0 && (
          <section className="uf-card__thread thread-replies" aria-label={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}>
            {folded_replies.is_folded && (
              <button type="button" onClick={folded_replies.expand} className="thread-replies__toggle">
                View {folded_replies.hidden_count} earlier {folded_replies.hidden_count === 1 ? "reply" : "replies"}
              </button>
            )}
            {folded_replies.can_fold && (
              <button type="button" onClick={folded_replies.collapse} className="thread-replies__toggle">
                Show fewer replies
              </button>
            )}
            {folded_replies.visible.map((reply) => (
              <FeedThreadReply
                key={reply.id}
                reply={reply}
                current_user={current_user}
                onLike={onLike}
                onReact={onReact}
                onReplyTo={() => replyTo(reply.actor)}
              />
            ))}
          </section>
        )}

        {/* Reply box: a "Write a reply..." pill under the replies, the full box once opened */}
        {show_composer && (is_composer_open || replies.length > 0) && (
          <div ref={reply_composer_ref} className="uf-card__composer">
            {is_composer_open ? (
              <FeedReplyComposer
                ref={reply_box_ref}
                current_user={current_user}
                loadPeople={() => loadFeedBoardPeople(board_id)}
                loadTeams={() => loadFeedBoardTeams(board_id)}
                onSubmit={(reply_body, mentioned_user_ids) => onReply?.(id, reply_body, mentioned_user_ids)}
                placeholder={feed_reply_placeholder}
                auto_focus
              />
            ) : (
              <div className="uf-card__reply-pill-row">
                <PersonAvatar person={current_user} size={28} />
                <button type="button" onClick={openComposer} className="uf-card__reply-pill">
                  Write a reply...
                </button>
              </div>
            )}
          </div>
        )}
      </article>

      {/* The big check beside the card: blue while unread, outlined once read */}
      {onToggleRead && (
        <button
          type="button"
          onClick={() => onToggleRead(id, is_thread_unread)}
          className="uf-check"
          data-state={is_thread_unread ? "unread" : "read"}
          aria-label={is_thread_unread ? "Mark as read" : "Mark as unread"}
          title={is_thread_unread ? "Mark as read" : "Mark as unread"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {absolute_link && (
        <CopyLinkModal
          is_open={is_share_open}
          title="Share update"
          description={`Anyone with access to ${breadcrumb.crumbs[breadcrumb.crumbs.length - 1] ?? "this board"} can open this update with the link.`}
          link={absolute_link}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
};

export default UpdateFeedCard;
