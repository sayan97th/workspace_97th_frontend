"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import {
  NotificationBookmarkGlyph,
  NotificationCheckCircleGlyph,
  NotificationLikeGlyph,
  NotificationMarkUnreadGlyph,
  NotificationTrashGlyph,
} from "./NotificationTypeIcon";

type NotificationQuickActionsProps = {
  is_unread: boolean;
  is_liked: boolean;
  is_saved: boolean;
  /** Keeps the bar on screen while something it opened (the "..." menu) is still open. */
  is_pinned?: boolean;
  /** Absent when there is no comment behind the notification, the Like button is then left out. */
  onToggleLike?: () => void;
  onToggleRead?: () => void;
  onToggleSave?: () => void;
  onDelete?: () => void;
  /** The "..." button, wired to the card's own menu. */
  more_trigger_ref?: React.Ref<HTMLButtonElement>;
  is_more_open?: boolean;
  onToggleMore?: () => void;
};

type QuickActionButtonProps = {
  label: string;
  /** Single key shortcut shown next to the label in the tooltip. */
  shortcut?: string;
  tone?: "default" | "like" | "read" | "save" | "danger";
  is_active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-haspopup" | "aria-expanded">;

const QuickActionButton = React.forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ label, shortcut, tone = "default", is_active = false, onClick, children, ...aria_props }, ref) => (
    <PortalTooltip
      content={
        <span className="nc-quick__tooltip">
          {label}
          {shortcut && <kbd className="nc-quick__kbd">{shortcut}</kbd>}
        </span>
      }
    >
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={tone === "default" || tone === "danger" ? undefined : is_active}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`nc-quick__button is-${tone} ${is_active ? "is-active" : ""}`}
        {...aria_props}
      >
        {children}
      </button>
    </PortalTooltip>
  )
);
QuickActionButton.displayName = "QuickActionButton";

/**
 * The floating bar of one click actions a notification card shows on hover,
 * like monday's notification center: Like the update behind it, Mark as read
 * (or unread), Save for later, Delete, and "..." for everything else. Liked
 * and saved stay highlighted, each button explains itself in a dark tooltip
 * with its keyboard shortcut.
 */
const NotificationQuickActions: React.FC<NotificationQuickActionsProps> = ({
  is_unread,
  is_liked,
  is_saved,
  is_pinned = false,
  onToggleLike,
  onToggleRead,
  onToggleSave,
  onDelete,
  more_trigger_ref,
  is_more_open = false,
  onToggleMore,
}) => (
  <div role="toolbar" aria-label="Notification actions" className={`nc-quick ${is_pinned ? "is-pinned" : ""}`}>
    {onToggleLike && (
      <QuickActionButton label={is_liked ? "Unlike" : "Like"} shortcut="L" tone="like" is_active={is_liked} onClick={onToggleLike}>
        <NotificationLikeGlyph size={16} filled={is_liked} />
      </QuickActionButton>
    )}

    {onToggleRead && (
      <QuickActionButton
        label={is_unread ? "Mark as read" : "Mark as unread"}
        shortcut="U"
        tone="read"
        is_active={!is_unread}
        onClick={onToggleRead}
      >
        {is_unread ? <NotificationCheckCircleGlyph size={16} /> : <NotificationMarkUnreadGlyph size={16} />}
      </QuickActionButton>
    )}

    {onToggleSave && (
      <QuickActionButton
        label={is_saved ? "Remove from saved" : "Save for later"}
        shortcut="S"
        tone="save"
        is_active={is_saved}
        onClick={onToggleSave}
      >
        <NotificationBookmarkGlyph size={16} filled={is_saved} />
      </QuickActionButton>
    )}

    {onDelete && (
      <QuickActionButton label="Delete" shortcut="E" tone="danger" onClick={onDelete}>
        <NotificationTrashGlyph size={16} />
      </QuickActionButton>
    )}

    {onToggleMore && (
      <>
        <span className="nc-quick__divider" aria-hidden="true" />
        <QuickActionButton
          ref={more_trigger_ref}
          label="More actions"
          onClick={onToggleMore}
          aria-haspopup="menu"
          aria-expanded={is_more_open}
        >
          <MoreDotsIcon size={16} />
        </QuickActionButton>
      </>
    )}
  </div>
);

export default NotificationQuickActions;
