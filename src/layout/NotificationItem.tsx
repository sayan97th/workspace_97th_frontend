"use client";
import React, { useRef, useState } from "react";
import BrandLogo from "@/components/common/BrandLogo";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  notification_snooze_presets,
  type NotificationActor,
  type NotificationSnoozePresetId,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import { ReplyIcon } from "@/icons/drawer-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import NotificationQuickActions from "./NotificationQuickActions";
import NotificationQuickReply from "./NotificationQuickReply";
import NotificationTypeIcon, { NotificationBellOffGlyph } from "./NotificationTypeIcon";
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
  /** One click Like on the comment behind the notification. */
  onToggleLike?: (id: string) => void;
  /** One click "Save for later", and back. */
  onToggleSave?: (id: string) => void;
  /** Posts an inline reply on the thread the notification is about. Rejects with the reason it failed. */
  onReply?: (id: string, body: string) => Promise<void>;
  /** Silences the item the notification is about, and brings it back. */
  onMuteItem?: (id: string) => void;
  onUnmuteItem?: (id: string) => void;
  /** The keyboard cursor (j and k) is on this card. */
  is_focused?: boolean;
};

const AVATAR_SIZE = 56;

/**
 * A single notification card, a one to one take on monday's current
 * notification center: a large avatar (the app logo when "Automations" sent
 * it), "Name @ Mentioned you in an update", the message itself underneath and
 * a "22m · Board name" footer. Unread cards sit on a soft blue background. On
 * hover a floating bar of one click actions appears in the bottom corner (Like,
 * Mark as read, Save for later, Delete), its "..." menu holds the rest (reply,
 * mute the item, remind me later).
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSelect,
  onDismiss,
  onMarkRead,
  onMarkUnread,
  onSnooze,
  onToggleLike,
  onToggleSave,
  onReply,
  onMuteItem,
  onUnmuteItem,
  is_focused = false,
}) => {
  const { id, actor, action_label, action_target, board, item_name, preview, time_label, is_unread, is_saved, is_liked, is_item_muted } =
    notification;
  const footer_target = board.name || item_name;
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_replying, setIsReplying] = useState(false);

  const can_reply = Boolean(onReply && notification.reply_to);
  const can_mute_item = notification.board_item_id !== undefined && Boolean(is_item_muted ? onUnmuteItem : onMuteItem);
  const can_like = Boolean(onToggleLike && notification.reply_to);
  const toggle_read = is_unread ? onMarkRead : onMarkUnread;
  const has_menu = Boolean(onSnooze || can_reply || can_mute_item);
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
          {actor.is_system ? (
            <span className="nc-card__system-avatar" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} aria-hidden="true">
              <BrandLogo size={26} />
            </span>
          ) : (
            <PersonAvatar person={notificationActorToPerson(actor)} size={AVATAR_SIZE} className="nc-card__avatar" />
          )}

          <span className="nc-card__body">
            <span className="nc-card__sentence">
              <strong className={`nc-card__actor ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</strong>
              {action_label && (
                <>
                  {" "}
                  <span className="nc-card__action">
                    <NotificationTypeIcon type={notification.type} size={16} />
                    {action_label}
                  </span>
                </>
              )}
              {action_target && <> {action_target}</>}
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
              {is_saved && <span className="nc-card__badge is-saved">Saved</span>}
              {is_item_muted && <span className="nc-card__badge">Item muted</span>}
              {is_unread && <span className="sr-only">Unread</span>}
            </span>
          </span>
        </button>

        <NotificationQuickActions
          is_unread={is_unread}
          is_liked={is_liked}
          is_saved={is_saved}
          is_pinned={is_menu_open}
          onToggleLike={can_like ? () => onToggleLike?.(id) : undefined}
          onToggleRead={toggle_read ? () => toggle_read(id) : undefined}
          onToggleSave={onToggleSave ? () => onToggleSave(id) : undefined}
          onDelete={onDismiss ? () => onDismiss(id) : undefined}
          more_trigger_ref={menu_trigger_ref}
          is_more_open={is_menu_open}
          onToggleMore={has_menu ? () => setIsMenuOpen((previous) => !previous) : undefined}
        />
      </div>

      {is_replying && onReply && (
        <NotificationQuickReply actor_name={actor.name} onSend={(body) => onReply(id, body)} onClose={() => setIsReplying(false)} />
      )}

      {has_menu && (
        <BoardPopover anchor_el={menu_trigger_ref.current} is_open={is_menu_open} onClose={closeMenu} width={208}>
          <div role="menu" className="nc-menu">
            {can_reply && (
              <button type="button" role="menuitem" onClick={runAndClose(() => setIsReplying(true))} className="nc-menu__item">
                <ReplyIcon size={16} />
                Reply
              </button>
            )}

            {can_mute_item && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleItemMuted)} className="nc-menu__item">
                <NotificationBellOffGlyph size={16} />
                {is_item_muted ? "Unmute this item" : "Mute this item"}
              </button>
            )}

            {onSnooze && (
              <>
                <div className={`nc-menu__label ${can_reply || can_mute_item ? "" : "is-first"}`}>Remind me later</div>
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
