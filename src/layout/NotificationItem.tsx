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
import { CheckIcon, CloseIcon, MoreDotsIcon } from "@/icons/workspace-icons";

/** The actor as the shared {@link PersonAvatar} expects it, so the drawer shows the real profile photo and falls back to initials. */
export const notificationActorToPerson = (actor: NotificationActor): BoardPersonOption => ({
  id: actor.id ?? "0",
  name: actor.name,
  initials: actor.initials,
  avatar_seed: Number(actor.id) || 0,
  avatar_url: actor.avatar_url,
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
 * a "..." menu (mark as read or unread, remind me later) plus a dismiss "×".
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
  is_nested = false,
  is_focused = false,
  is_selecting = false,
  is_selected = false,
  onToggleSelect,
}) => {
  const { id, actor, action_label, action_target, board, time_label, is_unread } = notification;
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_menu_open, setIsMenuOpen] = useState(false);

  const has_menu = Boolean(onMarkRead || onMarkUnread || onSnooze);
  const closeMenu = () => setIsMenuOpen(false);

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
            <strong className="font-bold text-shell-text">{actor.name}</strong>{" "}
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
            </span>
          )}
        </span>

        <span className="flex flex-none flex-col items-end gap-2">
          <span className="text-[11.5px] text-shell-text-faint">{time_label}</span>
          {is_unread && (
            <span
              className="h-2 w-2 rounded-full bg-[#3b82f6]"
              aria-label="Unread"
            />
          )}
        </span>
      </button>

      {!is_selecting && (onDismiss || has_menu) && (
        <div
          className={`absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-shell-panel-alt transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
            is_menu_open ? "opacity-100" : "opacity-0"
          }`}
        >
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

      {has_menu && (
        <BoardPopover anchor_el={menu_trigger_ref.current} is_open={is_menu_open} onClose={closeMenu} width={208}>
          <div role="menu" className="p-1.5">
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
