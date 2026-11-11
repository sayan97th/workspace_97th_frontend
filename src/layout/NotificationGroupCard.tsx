"use client";
import React, { useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { NotificationSnoozePresetId, WorkspaceNotification } from "@/data/notifications-data";
import { ChevronDownIcon, CloseIcon } from "@/icons/workspace-icons";
import NotificationItem, { NotificationBoardLine, NotificationSelectBox, notificationActorToPerson } from "./NotificationItem";
import NotificationTypeIcon from "./NotificationTypeIcon";

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
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  onReply?: (id: string, body: string) => Promise<void>;
  onMuteItem?: (id: string) => void;
  onUnmuteItem?: (id: string) => void;
  /** The keyboard cursor (j and k) is on this group. */
  is_focused?: boolean;
  /** Multi-select mode: a tick box shows and a click toggles the whole group instead of opening it. */
  is_selecting?: boolean;
  is_selected?: boolean;
  onToggleSelect?: (ids: string[]) => void;
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
 * people replying to one update) into a single card, showing the newest
 * message preview, with a toggle that
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
  onSave,
  onUnsave,
  onReply,
  onMuteItem,
  onUnmuteItem,
  is_focused = false,
  is_selecting = false,
  is_selected = false,
  onToggleSelect,
}) => {
  const [is_expanded, setIsExpanded] = useState(false);

  const latest = notifications[0];
  const unread_count = notifications.filter((notification) => notification.is_unread).length;

  const distinct_actors = notifications.filter(
    (notification, index) => notifications.findIndex((other) => other.actor.name === notification.actor.name) === index
  );
  const stacked_actors = distinct_actors.slice(0, MAX_STACKED_AVATARS);

  const card_class = ["nc-card", unread_count > 0 && "is-unread", is_selected && "is-selected", is_focused && "is-focused"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={card_class}>
      <button
        type="button"
        onClick={() => {
          const ids = notifications.map((notification) => notification.id);
          if (is_selecting) onToggleSelect?.(ids);
          else onSelectGroup(ids);
        }}
        aria-pressed={is_selecting ? is_selected : undefined}
        className="nc-card__main"
      >
        {is_selecting && <NotificationSelectBox is_selected={is_selected} />}
        <span className="nc-card__avatars">
          {stacked_actors.map((notification) => (
            <PersonAvatar key={notification.actor.name} person={notificationActorToPerson(notification.actor)} size={32} />
          ))}
        </span>

        <span className="nc-card__body">
          <span className="nc-card__head">
            <span className="nc-card__sentence">
              <strong className="nc-card__actor">
                {summarizeActors(distinct_actors.map((notification) => notification.actor.name))}
              </strong>{" "}
              {latest.action_label && (
                <span className="nc-card__action">
                  <NotificationTypeIcon type={latest.type} size={15} />
                  {lowerFirst(latest.action_label)}
                </span>
              )}{" "}
              {latest.action_target}
            </span>
            <span className="nc-card__meta">
              <time dateTime={latest.created_at}>{latest.time_label}</time>
              {unread_count > 0 && (
                <span className="nc-card__count" aria-label={`${unread_count} unread`}>
                  {unread_count}
                </span>
              )}
            </span>
          </span>
          {latest.preview && <span className="nc-card__preview">{latest.preview}</span>}
          {latest.board.name && <NotificationBoardLine board={latest.board} />}
        </span>
      </button>

      {!is_selecting && onDismiss && (
        <div className="nc-card__actions">
          <button
            type="button"
            onClick={() => notifications.forEach((notification) => onDismiss(notification.id))}
            aria-label="Dismiss all notifications in this group"
            title="Dismiss all"
            className="nc-card__action-button"
          >
            <CloseIcon size={13} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={is_expanded}
        className="nc-card__toggle"
      >
        <ChevronDownIcon size={11} />
        {is_expanded ? "Hide" : `Show all ${notifications.length}`}
      </button>

      {is_expanded && (
        <div className="nc-card__nested">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={onSelect}
              onDismiss={onDismiss}
              onMarkRead={onMarkRead}
              onMarkUnread={onMarkUnread}
              onSnooze={onSnooze}
              onSave={onSave}
              onUnsave={onUnsave}
              onReply={onReply}
              onMuteItem={onMuteItem}
              onUnmuteItem={onUnmuteItem}
              is_nested
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationGroupCard;
