"use client";
import React, { useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { NotificationSnoozePresetId, WorkspaceNotification } from "@/data/notifications-data";
import { ChevronDownIcon, CloseIcon } from "@/icons/workspace-icons";
import NotificationItem, { notificationActorToPerson } from "./NotificationItem";

type NotificationGroupCardProps = {
  /** Two or more notifications of the same type on the same thread, newest first. */
  notifications: WorkspaceNotification[];
  /** Opens the thread: marks every notification in the group read and follows the newest one's link. */
  onSelectGroup: (ids: string[]) => void;
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onSnooze?: (id: string, preset: NotificationSnoozePresetId) => void;
};

const MAX_STACKED_AVATARS = 3;

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** "Ada", "Ada and Grace", or "Ada and 3 others", from the distinct people behind the group. */
const summarizeActors = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} others`;
};

/**
 * Collapses several notifications about the same thread (for example three
 * people replying to one update) into a single card, with a toggle that
 * expands the individual notifications underneath. Keeps a busy thread from
 * burying everything else in the drawer.
 */
const NotificationGroupCard: React.FC<NotificationGroupCardProps> = ({
  notifications,
  onSelectGroup,
  onSelect,
  onDismiss,
  onMarkRead,
  onMarkUnread,
  onSnooze,
}) => {
  const [is_expanded, setIsExpanded] = useState(false);

  const latest = notifications[0];
  const unread_count = notifications.filter((notification) => notification.is_unread).length;

  const distinct_actors = notifications.filter(
    (notification, index) => notifications.findIndex((other) => other.actor.name === notification.actor.name) === index
  );
  const stacked_actors = distinct_actors.slice(0, MAX_STACKED_AVATARS);

  return (
    <div className="group relative">
      <div className="rounded-[11px] border border-shell-border bg-shell-panel-alt transition-colors hover:border-shell-border-strong">
        <button
          type="button"
          onClick={() => onSelectGroup(notifications.map((notification) => notification.id))}
          className="flex w-full gap-3 p-[13px] text-left"
        >
          <span className="flex flex-none items-start -space-x-2">
            {stacked_actors.map((notification) => (
              <PersonAvatar
                key={notification.actor.name}
                person={notificationActorToPerson(notification.actor)}
                size={30}
                className="ring-2 ring-shell-panel-alt"
              />
            ))}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-[1.5] text-shell-text-secondary">
              <strong className="font-bold text-shell-text">
                {summarizeActors(distinct_actors.map((notification) => notification.actor.name))}
              </strong>{" "}
              <span className="text-[#7fb2ff]">{lowerFirst(latest.action_label)}</span> {latest.action_target}
            </span>
            {latest.board.name && (
              <span className="mt-2 flex items-center gap-[7px] text-xs text-shell-text-muted">
                <span
                  className="h-[15px] w-[15px] flex-none rounded"
                  style={{ backgroundColor: latest.board.color }}
                  aria-hidden="true"
                />
                {latest.board.name}
              </span>
            )}
          </span>

          <span className="flex flex-none flex-col items-end gap-2">
            <span className="text-[11.5px] text-shell-text-faint">{latest.time_label}</span>
            {unread_count > 0 && (
              <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#3b82f6] px-1 text-[10px] font-bold text-white">
                {unread_count}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded((previous) => !previous)}
          aria-expanded={is_expanded}
          className="flex w-full items-center gap-1.5 border-t border-shell-border px-[13px] py-2 text-[12px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          <ChevronDownIcon size={11} className={`transition-transform ${is_expanded ? "rotate-180" : ""}`} />
          {is_expanded ? "Hide" : `Show all ${notifications.length}`}
        </button>

        {is_expanded && (
          <div className="flex flex-col gap-2 border-t border-shell-border p-2.5">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={onSelect}
                onDismiss={onDismiss}
                onMarkRead={onMarkRead}
                onMarkUnread={onMarkUnread}
                onSnooze={onSnooze}
                is_nested
              />
            ))}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={() => notifications.forEach((notification) => onDismiss(notification.id))}
          aria-label="Dismiss all notifications in this group"
          title="Dismiss all"
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-shell-panel-alt text-shell-text-faint opacity-0 transition-opacity hover:bg-shell-hover hover:text-shell-text focus:opacity-100 group-hover:opacity-100"
        >
          <CloseIcon size={11} />
        </button>
      )}
    </div>
  );
};

export default NotificationGroupCard;
