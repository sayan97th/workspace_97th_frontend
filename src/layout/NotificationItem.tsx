"use client";
import React, { useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  notification_snooze_presets,
  type NotificationActor,
  type NotificationSnoozePresetId,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import { CloseIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { ReplyIcon } from "@/icons/drawer-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import NotificationQuickReply from "./NotificationQuickReply";
import NotificationTypeIcon from "./NotificationTypeIcon";
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

type NotificationItemProps = {
  notification: WorkspaceNotification;
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onSnooze?: (id: string, preset: NotificationSnoozePresetId) => void;
  /** Posts an inline reply on the thread the notification is about. Rejects with the reason it failed. */
  onReply?: (id: string, body: string) => Promise<void>;
  /** Silences the item the notification is about, and brings it back. */
  onMuteItem?: (id: string) => void;
  onUnmuteItem?: (id: string) => void;
  /** The keyboard cursor (j and k) is on this card. */
  is_focused?: boolean;
};

const AVATAR_SIZE = 44;

/**
 * A single notification card, a one to one take on monday's notification
 * center: a large avatar, "Name @ Mentioned you in a reply", the message
 * itself underneath, and a "11m · Task 1" footer naming the item (or the
 * board when there is no item). Unread cards sit on a blue background. On
 * hover a reply button, a "..." menu (mark as read or unread, mute the item,
 * remind me later, delete) and a quick delete "×" appear in the top corner.
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSelect,
  onDismiss,
  onMarkRead,
  onMarkUnread,
  onSnooze,
  onReply,
  onMuteItem,
  onUnmuteItem,
  is_focused = false,
}) => {
  const { id, actor, action_label, action_target, board, item_name, preview, time_label, is_unread, is_item_muted } = notification;
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_replying, setIsReplying] = useState(false);

  const can_reply = Boolean(onReply && notification.reply_to);
  const can_mute_item = notification.board_item_id !== undefined && Boolean(is_item_muted ? onUnmuteItem : onMuteItem);
  const has_menu = Boolean(onMarkRead || onMarkUnread || onSnooze || onDismiss || can_reply || can_mute_item);
  const footer_target = item_name || board.name;
  const closeMenu = () => setIsMenuOpen(false);
  const toggleItemMuted = () => (is_item_muted ? onUnmuteItem?.(id) : onMuteItem?.(id));

  const runAndClose = (action: () => void) => () => {
    action();
    closeMenu();
  };

  const card_class = ["nc-card", is_unread && "is-unread", is_focused && "is-focused"].filter(Boolean).join(" ");

  return (
    <div>
      <div className={card_class}>
        <button type="button" onClick={() => onSelect?.(id)} className="nc-card__main">
          <PersonAvatar person={notificationActorToPerson(actor)} size={AVATAR_SIZE} className="nc-card__avatar" />

          <span className="nc-card__body">
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
            {preview && <span className="nc-card__preview">{preview}</span>}
            <span className="nc-card__footer">
              <time dateTime={notification.created_at} title={new Date(notification.created_at).toLocaleString()}>
                {time_label}
              </time>
              {footer_target && (
                <>
                  <span className="nc-card__footer-separator" aria-hidden="true">
                    •
                  </span>
                  <span className="nc-card__footer-target">{footer_target}</span>
                </>
              )}
              {is_item_muted && <span className="nc-card__badge">Item muted</span>}
              {is_unread && <span className="sr-only">Unread</span>}
            </span>
          </span>
        </button>

        {(has_menu || onDismiss) && (
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
                aria-label="Delete notification"
                title="Delete"
                className="nc-card__action-button"
              >
                <CloseIcon size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {is_replying && onReply && (
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

            {can_mute_item && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleItemMuted)} className="nc-menu__item">
                {is_item_muted ? "Unmute this item" : "Mute this item"}
              </button>
            )}

            {onDismiss && (
              <button type="button" role="menuitem" onClick={runAndClose(() => onDismiss(id))} className="nc-menu__item">
                Delete
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
