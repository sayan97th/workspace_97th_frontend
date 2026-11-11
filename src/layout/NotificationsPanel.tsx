"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { NotificationBulkAction } from "@/services/notifications.service";
import { BellIcon, CloseIcon, MoreDotsIcon, SearchIcon } from "@/icons/workspace-icons";
import {
  notification_search_placeholder,
  notification_tabs,
  type NotificationFilterOptions,
  type NotificationFilters,
  type NotificationSnoozePresetId,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import SlideOverDrawer from "./SlideOverDrawer";
import NotificationItem from "./NotificationItem";
import NotificationPersonFilter from "./NotificationPersonFilter";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import { NotificationCheckCircleGlyph, NotificationSettingsGlyph, NotificationTrashGlyph } from "./NotificationTypeIcon";
import "./notifications-panel.scss";

type NotificationsPanelProps = {
  is_open: boolean;
  onClose: () => void;
  notifications: WorkspaceNotification[];
  /** The filters `notifications` was fetched with, applied server-side. */
  filters: NotificationFilters;
  onFiltersChange: (patch: Partial<NotificationFilters>) => void;
  /** The people "Filter by person" offers, loaded through {@link NotificationsPanelProps.onLoadFilterOptions}. */
  filter_options: NotificationFilterOptions;
  onLoadFilterOptions: () => void;
  is_loading: boolean;
  is_loading_more: boolean;
  has_more: boolean;
  onLoadMore: () => void;
  onSelectNotification: (id: string) => void;
  onMarkAllAsRead?: () => void;
  /** "Delete all" in the "..." menu, asked for confirmation first. */
  onDeleteAll?: () => void;
  onDismissNotification?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onSnoozeNotification?: (id: string, preset: NotificationSnoozePresetId) => void;
  /** Posts an inline reply from a notification card, without opening the update. Rejects with the reason it failed. */
  onReplyToNotification?: (id: string, body: string) => Promise<void>;
  /** Mutes or unmutes the item a notification is about. */
  onMuteNotificationItem?: (id: string) => void;
  onUnmuteNotificationItem?: (id: string) => void;
  /** Applies one action to the focused notification, powers the e and u shortcuts. */
  onBulkAction?: (action: NotificationBulkAction, ids: string[]) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Wide enough for two lines of message preview, like monday's notification center. */
const DRAWER_WIDTH = 600;

/** Whether a key press comes from somewhere the person is typing, where the drawer's shortcuts must stay out of the way. */
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/**
 * Notifications drawer opened from the AppTopBar bell, built to match
 * monday's notification center: the title with a "..." menu (Mark all as
 * read, Delete all, Settings) and close, the All, Unread, I was mentioned and
 * Assigned to me tabs, "Search all notifications" next to "Filter by person",
 * and a flat newest first list of cards. Filtering happens server-side and the
 * list pages in as it is scrolled, both driven by `useNotifications`, this
 * component only renders them. j and k move between cards, o opens, e deletes
 * and u toggles read.
 */
const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  is_open,
  onClose,
  notifications,
  filters,
  onFiltersChange,
  filter_options,
  onLoadFilterOptions,
  is_loading,
  is_loading_more,
  has_more,
  onLoadMore,
  onSelectNotification,
  onMarkAllAsRead,
  onDeleteAll,
  onDismissNotification,
  onMarkAsRead,
  onMarkAsUnread,
  onSnoozeNotification,
  onReplyToNotification,
  onMuteNotificationItem,
  onUnmuteNotificationItem,
  onBulkAction,
}) => {
  const [search_text, setSearchText] = useState(filters.search);
  const more_menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_more_menu_open, setIsMoreMenuOpen] = useState(false);
  const [is_confirming_delete, setIsConfirmingDelete] = useState(false);
  const [is_preferences_open, setIsPreferencesOpen] = useState(false);
  const scroll_area_ref = useRef<HTMLDivElement>(null);
  const [focused_id, setFocusedId] = useState<string | null>(null);

  // The person menu only lists who actually appears in the user's notifications, refreshed each time the drawer opens.
  useEffect(() => {
    if (is_open) onLoadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open]);

  // Typing filters on the server, so wait for a pause before asking.
  useEffect(() => {
    if (search_text === filters.search) return;
    const timeout_id = setTimeout(() => onFiltersChange({ search: search_text }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout_id);
  }, [search_text, filters.search, onFiltersChange]);

  const sentinel_ref = useInfiniteScroll({
    onLoadMore,
    can_load_more: is_open && has_more && !is_loading && !is_loading_more,
    root_ref: scroll_area_ref,
    watch: notifications.length,
  });

  // A deleted or filtered out notification can no longer hold the keyboard cursor.
  useEffect(() => {
    setFocusedId((previous) => (previous !== null && !notifications.some((item) => item.id === previous) ? null : previous));
  }, [notifications]);

  useEffect(() => {
    if (!is_open) setFocusedId(null);
  }, [is_open]);

  useEffect(() => {
    if (!focused_id) return;
    scroll_area_ref.current?.querySelector(`[data-row-key="${CSS.escape(focused_id)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focused_id]);

  // Keyboard shortcuts, live only while the drawer is open and nothing is being typed.
  useEffect(() => {
    if (!is_open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target) || notifications.length === 0) return;

      const index = notifications.findIndex((item) => item.id === focused_id);
      const focused = index >= 0 ? notifications[index] : null;
      const move = (next_index: number) => {
        event.preventDefault();
        setFocusedId(notifications[Math.min(Math.max(next_index, 0), notifications.length - 1)].id);
      };

      if (event.key === "j") return move(index + 1);
      if (event.key === "k") return move(index === -1 ? 0 : index - 1);
      if (!focused) return;

      if (event.key === "o") {
        event.preventDefault();
        onSelectNotification(focused.id);
      } else if (event.key === "u" && onBulkAction) {
        event.preventDefault();
        onBulkAction(focused.is_unread ? "read" : "unread", [focused.id]);
      } else if (event.key === "e" && onBulkAction) {
        event.preventDefault();
        // Leave the cursor on the neighbour that takes its place.
        const neighbour = notifications[index + 1] ?? notifications[index - 1];
        setFocusedId(neighbour ? neighbour.id : null);
        onBulkAction("dismiss", [focused.id]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, notifications, focused_id, onBulkAction, onSelectNotification]);

  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false);
    setIsConfirmingDelete(false);
  };

  const has_unread = notifications.some((notification) => notification.is_unread);

  const renderEmptyState = () => {
    if (is_loading) return <p className="nc-list__status">Loading notifications...</p>;
    const is_filtered = filters.tab !== "all" || filters.search.trim() !== "" || filters.actor_id !== null;
    return (
      <div className="nc-empty">
        <span className="nc-empty__icon">
          <BellIcon size={24} />
        </span>
        <span className="nc-empty__title">{is_filtered ? "No notifications found" : "You're all caught up"}</span>
        <span>
          {is_filtered ? "Try another tab, search or person." : "New mentions, replies and assignments will show up here."}
        </span>
      </div>
    );
  };

  return (
    <SlideOverDrawer is_open={is_open} onClose={onClose} aria_label="Notifications" width={DRAWER_WIDTH}>
      <div className="nc-panel">
        <div className="nc-header">
          <div className="nc-header__top">
            <h2 className="nc-header__title">Notifications</h2>
            <div className="nc-header__actions">
              <button
                ref={more_menu_trigger_ref}
                type="button"
                onClick={() => (is_more_menu_open ? closeMoreMenu() : setIsMoreMenuOpen(true))}
                className="nc-icon-button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={is_more_menu_open}
                title="More actions"
              >
                <MoreDotsIcon size={20} />
              </button>
              <BoardPopover anchor_el={more_menu_trigger_ref.current} is_open={is_more_menu_open} onClose={closeMoreMenu} width={220}>
                {is_confirming_delete ? (
                  <div className="nc-confirm" role="alertdialog" aria-label="Delete all notifications">
                    <p className="nc-confirm__title">Delete all notifications?</p>
                    <p className="nc-confirm__text">They will be removed from every tab. This cannot be undone.</p>
                    <div className="nc-confirm__actions">
                      <button type="button" onClick={() => setIsConfirmingDelete(false)} className="nc-text-button">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAll?.();
                          closeMoreMenu();
                        }}
                        className="nc-danger-button"
                      >
                        Delete all
                      </button>
                    </div>
                  </div>
                ) : (
                  <div role="menu" className="nc-menu">
                    {onMarkAllAsRead && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!has_unread}
                        onClick={() => {
                          onMarkAllAsRead();
                          closeMoreMenu();
                        }}
                        className="nc-menu__item"
                      >
                        <NotificationCheckCircleGlyph size={16} />
                        Mark all as read
                      </button>
                    )}
                    {onDeleteAll && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={notifications.length === 0}
                        onClick={() => setIsConfirmingDelete(true)}
                        className="nc-menu__item"
                      >
                        <NotificationTrashGlyph size={16} />
                        Delete all
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMoreMenu();
                        setIsPreferencesOpen(true);
                      }}
                      className="nc-menu__item"
                    >
                      <NotificationSettingsGlyph size={16} />
                      Settings
                    </button>
                  </div>
                )}
              </BoardPopover>
              <NotificationPreferencesPanel
                anchor_el={more_menu_trigger_ref.current}
                is_open={is_preferences_open}
                onClose={() => setIsPreferencesOpen(false)}
              />
              <span className="nc-header__divider" aria-hidden="true" />
              <button type="button" onClick={onClose} className="nc-icon-button" aria-label="Close notifications" title="Close">
                <CloseIcon size={18} />
              </button>
            </div>
          </div>

          <div role="tablist" aria-label="Notification types" className="nc-tabs">
            {notification_tabs.map((tab) => {
              const is_active = tab.id === filters.tab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={is_active}
                  onClick={() => onFiltersChange({ tab: tab.id })}
                  className={`nc-tab ${is_active ? "is-active" : ""}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="nc-toolbar">
            <label className="nc-search">
              <span className="sr-only">Search all notifications</span>
              <input
                type="text"
                value={search_text}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={notification_search_placeholder}
              />
              <SearchIcon size={16} />
            </label>
            <NotificationPersonFilter
              options={filter_options.actors}
              selected_id={filters.actor_id}
              onSelect={(actor_id) => onFiltersChange({ actor_id })}
            />
          </div>
        </div>

        <div ref={scroll_area_ref} className="nc-list shell-scrollbar">
          {notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="nc-list__items">
              {notifications.map((notification) => (
                <div key={notification.id} data-row-key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onSelect={onSelectNotification}
                    onDismiss={onDismissNotification}
                    onMarkRead={onMarkAsRead}
                    onMarkUnread={onMarkAsUnread}
                    onSnooze={onSnoozeNotification}
                    onReply={onReplyToNotification}
                    onMuteItem={onMuteNotificationItem}
                    onUnmuteItem={onUnmuteNotificationItem}
                    is_focused={notification.id === focused_id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Sentinel: reaching it loads the next page. */}
          <div ref={sentinel_ref} aria-hidden="true" className="h-px" />
          {is_loading_more && (
            <div className="nc-list__spinner" role="status" aria-label="Loading more notifications">
              <span />
            </div>
          )}
        </div>
      </div>
    </SlideOverDrawer>
  );
};

export default NotificationsPanel;
