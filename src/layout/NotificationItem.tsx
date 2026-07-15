"use client";
import React from "react";
import type { WorkspaceNotification } from "@/data/notifications-data";

type NotificationItemProps = {
  notification: WorkspaceNotification;
  onSelect?: (id: string) => void;
};

/**
 * A single notification card: gradient avatar, actor + action sentence, the
 * board chip it is scoped to, a relative time and an unread dot. Reusable in the
 * notifications drawer and anywhere a notification feed is rendered.
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSelect,
}) => {
  const { id, actor, action_label, action_target, board, time_label, is_unread } =
    notification;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className="flex w-full gap-3 rounded-[11px] border border-shell-border bg-shell-panel-alt p-[13px] text-left transition-colors hover:border-shell-border-strong"
    >
      <span
        className={`h-[30px] w-[30px] flex-none rounded-full bg-gradient-to-br ${actor.avatar_gradient}`}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[1.5] text-shell-text-secondary">
          <strong className="font-bold text-shell-text">{actor.name}</strong>{" "}
          <span className="text-[#7fb2ff]">{action_label}</span> {action_target}
        </span>
        <span className="mt-2 flex items-center gap-[7px] text-xs text-shell-text-muted">
          <span
            className="h-[15px] w-[15px] flex-none rounded"
            style={{ backgroundColor: board.color }}
            aria-hidden="true"
          />
          {board.name}
        </span>
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
  );
};

export default NotificationItem;
