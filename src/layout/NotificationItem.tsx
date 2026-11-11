"use client";
import React, { useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  notification_snooze_presets,
  type NotificationActor,
  type NotificationBoard,
  type NotificationSnoozePresetId,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import { BookmarkIcon, CheckIcon, CloseIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { ReplyIcon } from "@/icons/drawer-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import NotificationQuickReply from "./NotificationQuickReply";
import NotificationTypeIcon, { NotificationBoardGlyph } from "./NotificationTypeIcon";
import "./notifications-panel.scss";

/** The actor as the shared {@link PersonAvatar} expects it, so the drawer shows the real profile photo and falls back to initials. */
export const notificationActorToPerson = (actor: NotificationActor): BoardPersonOption => ({
  id: actor.id ?? "0",
  name: actor.name,
  initials: actor.initials,
  avatar_seed: Number(actor.id) || 0,
  avatar_url: actor.avatar_url,
  is_deactivated: actor.is_deactivated,
});

/** The round tick box shown in front of a card while the drawer is in multi-select mode. */
export const NotificationSelectBox: React.FC<{ is_selected: boolean }> = ({ is_selected }) => (
  <span
    role="checkbox"
    aria-checked={is_selected}
    aria-label={is_selected ? "Selected" : "Not selected"}
    className={`mt-1.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border transition-colors ${
      is_selected ? "border-[#0073ea] bg-[#0073ea] text-white" : "border-shell-border-strong text-transparent"
    }`}
  >
    <CheckIcon size={10} />
  </span>
);

/** The "[board icon] Board name" line at the bottom of a card, with the "Item muted" badge when it applies. */
export const NotificationBoardLine: React.FC<{ board: NotificationBoard; is_item_muted?: boolean }> = ({ board, is_item_muted = false }) => (
  <span className="nc-card__board">
    <span className="nc-card__board-icon" style={{ backgroundColor: board.color }} aria-hidden="true">
      <NotificationBoardGlyph size={12} />
    </span>
    <span className="nc-card__board-name">{board.name}</span>
    {is_item_muted && <span className="nc-card__badge">Item muted</span>}
  </span>
);

type NotificationItemProps = {
  notification: WorkspaceNotification;
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onSnooze?: (id: string, preset: NotificationSnoozePresetId) => void;
  /** "Save for later" and its undo, the card shows a bookmark button and a menu entry for whichever applies. */
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  /** Posts an inline reply on the thread the notification is about. Rejects with the reason it failed. */
  onReply?: (id: string, body: string) => Promise<void>;
  /** Silences the item the notification is about, and brings it back. */
  onMuteItem?: (id: string) => void;
  onUnmuteItem?: (id: string) => void;
  /** Rendered inside an expanded {@link NotificationGroupCard}, so it sits a little tighter. */
  is_nested?: boolean;
  /** The keyboard cursor (j and k) is on this card. */
  is_focused?: boolean;
  /** Multi-select mode: a tick box shows and a click toggles the selection instead of opening the notification. */
  is_selecting?: boolean;
  is_selected?: boolean;
  onToggleSelect?: (id: string) => void;
};


/**
 * A single notification card in monday's notification center look: the
 * actor's avatar, the "Name @ Mentioned you in an update" sentence, a two line
 * preview of the message itself, the board it belongs to, a short relative
 * time and an unread dot, on a soft blue card while unread. On hover it shows
 * a reply button, a "..." menu (mark as read or unread, save for later, remind me later), a
 * bookmark button that keeps it in the Saved tab, plus a dismiss "×".
 * Reusable in the notifications drawer and anywhere a notification feed is
 * rendered.
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSelect,
  onDismiss,
  onMarkRead,
  onMarkUnread,
  onSnooze,
  onSave,
  onUnsave,
  onReply,
  onMuteItem,
  onUnmuteItem,
  is_nested = false,
  is_focused = false,
  is_selecting = false,
  is_selected = false,
  onToggleSelect,
}) => {
  const { id, actor, action_label, action_target, board, preview, time_label, is_unread, is_saved, is_item_muted } = notification;
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_replying, setIsReplying] = useState(false);

  const can_reply = Boolean(onReply && notification.reply_to);
  const can_mute_item = notification.board_item_id !== undefined && Boolean(is_item_muted ? onUnmuteItem : onMuteItem);
  const has_menu = Boolean(onMarkRead || onMarkUnread || onSnooze || onSave || onUnsave || can_reply || can_mute_item);
  const toggleSaved = () => (is_saved ? onUnsave?.(id) : onSave?.(id));
  const can_toggle_saved = is_saved ? Boolean(onUnsave) : Boolean(onSave);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleItemMuted = () => (is_item_muted ? onUnmuteItem?.(id) : onMuteItem?.(id));

  const runAndClose = (action: () => void) => () => {
    action();
    closeMenu();
  };

  const card_class = [
    "nc-card",
    is_unread && "is-unread",
    is_nested && "is-nested",
    is_selected && "is-selected",
    is_focused && "is-focused",
  ]
    .filter(Boolean)
    .join(" ");
  const has_actions = !is_selecting && (Boolean(onDismiss) || has_menu || can_toggle_saved || can_reply);

  return (
    <div>
      <div className={card_class}>
        <button
          type="button"
          onClick={() => (is_selecting ? onToggleSelect?.(id) : onSelect?.(id))}
          aria-pressed={is_selecting ? is_selected : undefined}
          className="nc-card__main"
        >
          {is_selecting && <NotificationSelectBox is_selected={is_selected} />}
          <PersonAvatar person={notificationActorToPerson(actor)} size={is_nested ? 28 : 32} className="nc-card__avatar" />

          <span className="nc-card__body">
            <span className="nc-card__head">
              <span className="nc-card__sentence">
                <strong className={`nc-card__actor ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</strong>{" "}
                {action_label && (
                  <span className="nc-card__action">
                    <NotificationTypeIcon type={notification.type} size={15} />
                    {action_label}
                  </span>
                )}{" "}
                {action_target}
              </span>
              <span className="nc-card__meta">
                {is_saved && <BookmarkIcon size={13} filled className="nc-card__saved" />}
                <time dateTime={notification.created_at} title={new Date(notification.created_at).toLocaleString()}>
                  {time_label}
                </time>
                {is_unread && <span className="nc-card__dot" aria-label="Unread" />}
              </span>
            </span>
            {preview && <span className="nc-card__preview">{preview}</span>}
            {board.name && <NotificationBoardLine board={board} is_item_muted={is_item_muted} />}
          </span>
        </button>

        {has_actions && (
          <div className={`nc-card__actions ${is_menu_open ? "is-open" : ""}`}>
            {can_reply && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsReplying((previous) => !previous);
                }}
                aria-label="Reply"
                aria-expanded={is_replying}
                title="Reply"
                className={`nc-card__action-button ${is_replying ? "is-active" : ""}`}
              >
                <ReplyIcon size={15} />
              </button>
            )}
            {can_toggle_saved && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSaved();
                }}
                aria-label={is_saved ? "Remove from saved" : "Save for later"}
                aria-pressed={is_saved}
                title={is_saved ? "Remove from saved" : "Save for later"}
                className={`nc-card__action-button ${is_saved ? "is-active" : ""}`}
              >
                <BookmarkIcon size={15} filled={is_saved} />
              </button>
            )}
            {has_menu && (
              <button
                ref={menu_trigger_ref}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen((previous) => !previous);
                }}
                aria-label="Notification options"
                aria-haspopup="menu"
                aria-expanded={is_menu_open}
                title="More options"
                className="nc-card__action-button"
              >
                <MoreDotsIcon size={16} />
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss(id);
                }}
                aria-label="Dismiss notification"
                title="Dismiss"
                className="nc-card__action-button"
              >
                <CloseIcon size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {is_replying && onReply && !is_selecting && (
        <NotificationQuickReply actor_name={actor.name} onSend={(body) => onReply(id, body)} onClose={() => setIsReplying(false)} />
      )}

      {has_menu && (
        <BoardPopover anchor_el={menu_trigger_ref.current} is_open={is_menu_open} onClose={closeMenu} width={208}>
          <div role="menu" className="nc-menu">
            {can_reply && (
              <button type="button" role="menuitem" onClick={runAndClose(() => setIsReplying(true))} className="nc-menu__item">
                Reply
              </button>
            )}
            {is_unread
              ? onMarkRead && (
                  <button type="button" role="menuitem" onClick={runAndClose(() => onMarkRead(id))} className="nc-menu__item">
                    Mark as read
                  </button>
                )
              : onMarkUnread && (
                  <button type="button" role="menuitem" onClick={runAndClose(() => onMarkUnread(id))} className="nc-menu__item">
                    Mark as unread
                  </button>
                )}

            {can_toggle_saved && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleSaved)} className="nc-menu__item">
                {is_saved ? "Remove from saved" : "Save for later"}
              </button>
            )}

            {can_mute_item && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleItemMuted)} className="nc-menu__item">
                {is_item_muted ? "Unmute this item" : "Mute this item"}
              </button>
            )}

            {onSnooze && (
              <>
                <div className="nc-menu__label">Remind me</div>
                {notification_snooze_presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="menuitem"
                    onClick={runAndClose(() => onSnooze(id, preset.id))}
                    className="nc-menu__item"
                  >
                    {preset.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </BoardPopover>
      )}
    </div>
  );
};

export default NotificationItem;
