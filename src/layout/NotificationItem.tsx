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
import { BookmarkIcon, CheckIcon, CloseIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { ReplyIcon } from "@/icons/drawer-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import NotificationQuickReply from "./NotificationQuickReply";

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
    className={`mt-1 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border transition-colors ${
      is_selected ? "border-brand-500 bg-brand-500 text-white" : "border-shell-border-strong text-transparent"
    }`}
  >
    <CheckIcon size={10} />
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

const MENU_ITEM_CLASS =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover hover:text-shell-text";

/**
 * A single notification card: the actor's avatar, actor + action sentence, the
 * board chip it is scoped to, a relative time, an unread dot, and (on hover)
 * a "..." menu (mark as read or unread, save for later, remind me later), a
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
  const { id, actor, action_label, action_target, board, time_label, is_unread, is_saved, is_item_muted } = notification;
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

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => (is_selecting ? onToggleSelect?.(id) : onSelect?.(id))}
        aria-pressed={is_selecting ? is_selected : undefined}
        className={`flex w-full gap-3 rounded-[11px] border bg-shell-panel-alt text-left transition-colors hover:border-shell-border-strong ${
          is_selected ? "border-brand-500" : "border-shell-border"
        } ${is_focused ? "ring-2 ring-brand-500/60" : ""} ${is_nested ? "p-[11px]" : "p-[13px]"}`}
      >
        {is_selecting && <NotificationSelectBox is_selected={is_selected} />}
        <PersonAvatar person={notificationActorToPerson(actor)} size={30} />

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-[1.5] text-shell-text-secondary">
            <strong className={`font-bold text-shell-text ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</strong>{" "}
            <span className="text-[#7fb2ff]">{action_label}</span> {action_target}
          </span>
          {board.name && (
            <span className="mt-2 flex items-center gap-[7px] text-xs text-shell-text-muted">
              <span
                className="h-[15px] w-[15px] flex-none rounded"
                style={{ backgroundColor: board.color }}
                aria-hidden="true"
              />
              {board.name}
              {is_item_muted && (
                <span className="rounded-[5px] bg-shell-hover px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-shell-text-faint">Item muted</span>
              )}
            </span>
          )}
        </span>

        <span className="flex flex-none flex-col items-end gap-2">
          <span className="flex items-center gap-1.5 text-[11.5px] text-shell-text-faint">
            {is_saved && <BookmarkIcon size={11} filled className="text-[#7fb2ff]" />}
            {time_label}
          </span>
          {is_unread && (
            <span
              className="h-2 w-2 rounded-full bg-[#3b82f6]"
              aria-label="Unread"
            />
          )}
        </span>
      </button>

      {!is_selecting && (onDismiss || has_menu || can_toggle_saved || can_reply) && (
        <div
          className={`absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-shell-panel-alt transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
            is_menu_open ? "opacity-100" : "opacity-0"
          }`}
        >
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
              className={`flex h-5 w-5 items-center justify-center rounded-md bg-shell-panel-alt hover:bg-shell-hover ${
                is_replying ? "text-[#7fb2ff]" : "text-shell-text-faint hover:text-shell-text"
              }`}
            >
              <ReplyIcon size={12} />
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
              className="flex h-5 w-5 items-center justify-center rounded-md bg-shell-panel-alt text-shell-text-faint hover:bg-shell-hover hover:text-shell-text"
            >
              <MoreDotsIcon size={13} />
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
              className={`flex h-5 w-5 items-center justify-center rounded-md bg-shell-panel-alt hover:bg-shell-hover ${
                is_saved ? "text-[#7fb2ff]" : "text-shell-text-faint hover:text-shell-text"
              }`}
            >
              <BookmarkIcon size={12} filled={is_saved} />
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
              className="flex h-5 w-5 items-center justify-center rounded-md bg-shell-panel-alt text-shell-text-faint hover:bg-shell-hover hover:text-shell-text"
            >
              <CloseIcon size={11} />
            </button>
          )}
        </div>
      )}

      {is_replying && onReply && !is_selecting && (
        <NotificationQuickReply actor_name={actor.name} onSend={(body) => onReply(id, body)} onClose={() => setIsReplying(false)} />
      )}

      {has_menu && (
        <BoardPopover anchor_el={menu_trigger_ref.current} is_open={is_menu_open} onClose={closeMenu} width={208}>
          <div role="menu" className="p-1.5">
            {can_reply && (
              <button type="button" role="menuitem" onClick={runAndClose(() => setIsReplying(true))} className={MENU_ITEM_CLASS}>
                Reply
              </button>
            )}
            {is_unread
              ? onMarkRead && (
                  <button type="button" role="menuitem" onClick={runAndClose(() => onMarkRead(id))} className={MENU_ITEM_CLASS}>
                    Mark as read
                  </button>
                )
              : onMarkUnread && (
                  <button type="button" role="menuitem" onClick={runAndClose(() => onMarkUnread(id))} className={MENU_ITEM_CLASS}>
                    Mark as unread
                  </button>
                )}

            {can_toggle_saved && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleSaved)} className={MENU_ITEM_CLASS}>
                {is_saved ? "Remove from saved" : "Save for later"}
              </button>
            )}

            {can_mute_item && (
              <button type="button" role="menuitem" onClick={runAndClose(toggleItemMuted)} className={MENU_ITEM_CLASS}>
                {is_item_muted ? "Unmute this item" : "Mute this item"}
              </button>
            )}

            {onSnooze && (
              <>
                <div className="mt-1 border-t border-shell-border px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">
                  Remind me
                </div>
                {notification_snooze_presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="menuitem"
                    onClick={runAndClose(() => onSnooze(id, preset.id))}
                    className={MENU_ITEM_CLASS}
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
