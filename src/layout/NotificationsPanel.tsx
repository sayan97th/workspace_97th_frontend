"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import FilterMenu from "@/components/ui/filter-menu/FilterMenu";
import { useTheme } from "@/context/ThemeContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import SlideOverDrawer from "./SlideOverDrawer";
import NotificationGroupCard from "./NotificationGroupCard";
import NotificationItem from "./NotificationItem";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import NotificationSummaryCard from "./NotificationSummaryCard";
import { NotificationSettingsGlyph } from "./NotificationTypeIcon";
import type { NotificationBulkAction } from "@/services/notifications.service";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { BellIcon, CheckCircleIcon, CheckIcon, CloseIcon, MoreDotsIcon, SearchIcon, SunIcon } from "@/icons/workspace-icons";
import "./notifications-panel.scss";
import {
  notification_date_groups,
  notificationDateGroupOf,
  notification_search_placeholder,
  notification_tabs,
  type NotificationDateGroup,
  type NotificationFilterOptions,
  type NotificationFilters,
  type NotificationSnoozePresetId,
  type NotificationSummary,
  type NotificationTabId,
  type WorkspaceNotification,
} from "@/data/notifications-data";

type NotificationsPanelProps = {
  is_open: boolean;
  onClose: () => void;
  notifications: WorkspaceNotification[];
  /** The filters `notifications` was fetched with, applied server-side. */
  filters: NotificationFilters;
  onFiltersChange: (patch: Partial<NotificationFilters>) => void;
  /** Boards and people the filter menus offer, loaded through {@link NotificationsPanelProps.onLoadFilterOptions}. */
  filter_options: NotificationFilterOptions;
  onLoadFilterOptions: () => void;
  is_loading: boolean;
  is_loading_more: boolean;
  has_more: boolean;
  onLoadMore: () => void;
  onSelectNotification: (id: string) => void;
  /** Opens a collapsed group: marks all of its notifications read and follows the newest one. */
  onSelectGroup: (ids: string[]) => void;
  onMarkAllAsRead?: () => void;
  onDismissNotification?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onSnoozeNotification?: (id: string, preset: NotificationSnoozePresetId) => void;
  /** "Save for later" and its undo, saved notifications live in the Saved tab and survive "Mark all as read". */
  onSaveNotification?: (id: string) => void;
  onUnsaveNotification?: (id: string) => void;
  /** Posts an inline reply from a notification card, without opening the update. Rejects with the reason it failed. */
  onReplyToNotification?: (id: string, body: string) => Promise<void>;
  /** Mutes or unmutes the item a notification is about. */
  onMuteNotificationItem?: (id: string) => void;
  onUnmuteNotificationItem?: (id: string) => void;
  /** What is waiting for the person, shown as a card on top of the unfiltered All tab. */
  summary?: NotificationSummary | null;
  onLoadSummary?: () => void;
  /** Applies one action to several notifications at once, powers the multi-select toolbar and the e and u shortcuts. */
  onBulkAction?: (action: NotificationBulkAction, ids: string[]) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Whether a key press comes from somewhere the person is typing, where the drawer's shortcuts must stay out of the way. */
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** monday's notification center drawer is wider than the other slide overs, so the message preview has room. */
const DRAWER_WIDTH = 580;

/**
 * Buckets a date section's notifications by thread: notifications sharing a
 * `group_key` are collapsed into one entry, kept in the order their newest
 * member first appears, so the list still reads newest first.
 */
const groupByThread = (notifications: WorkspaceNotification[]): WorkspaceNotification[][] => {
  const threads = new Map<string, WorkspaceNotification[]>();
  for (const notification of notifications) {
    threads.set(notification.group_key, [...(threads.get(notification.group_key) ?? []), notification]);
  }
  return Array.from(threads.values());
};

/**
 * Notifications drawer opened from the AppTopBar bell. Shows the "All",
 * "Mentioned", "Assigned", "Replies", "Reactions" and "Saved" tabs, a
 * summary card of what is waiting (on the unfiltered All tab), a search box,
 * board and person filters, an "unread only" toggle and the notification list,
 * grouped by date and then by thread. Filtering happens server-side and the
 * list pages in as it is scrolled, both driven by `useNotifications`, this
 * component only renders them. "Select" turns on multi-select with a bulk
 * toolbar (read, unread, save, dismiss), and the list is keyboard driven: j and
 * k move, o opens, e dismisses, u toggles read, s saves, x selects.
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
  onSelectGroup,
  onMarkAllAsRead,
  onDismissNotification,
  onMarkAsRead,
  onMarkAsUnread,
  onSnoozeNotification,
  onSaveNotification,
  onUnsaveNotification,
  onReplyToNotification,
  onMuteNotificationItem,
  onUnmuteNotificationItem,
  summary,
  onLoadSummary,
  onBulkAction,
}) => {
  const { resolved_theme, toggleTheme } = useTheme();
  const [search_text, setSearchText] = useState(filters.search);
  const [is_preferences_open, setIsPreferencesOpen] = useState(false);
  const preferences_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_more_menu_open, setIsMoreMenuOpen] = useState(false);
  const more_menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const scroll_area_ref = useRef<HTMLDivElement>(null);
  const [is_selecting, setIsSelecting] = useState(false);
  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());
  // The keyboard cursor, identified by the first notification of the thread it sits on.
  const [focused_key, setFocusedKey] = useState<string | null>(null);

  // The board and person menus only list what actually appears in the user's
  // notifications, refreshed each time the drawer opens.
  useEffect(() => {
    if (is_open) {
      onLoadFilterOptions();
      onLoadSummary?.();
    }
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

  const grouped_notifications = useMemo(() => {
    const groups = new Map<NotificationDateGroup, WorkspaceNotification[]>();
    for (const notification of notifications) {
      const group_id = notificationDateGroupOf(notification.created_at);
      groups.set(group_id, [...(groups.get(group_id) ?? []), notification]);
    }
    return notification_date_groups
      .map((group) => ({ ...group, threads: groupByThread(groups.get(group.id) ?? []) }))
      .filter((group) => group.threads.length > 0);
  }, [notifications]);

  // Saved notifications survive "Mark all as read", so only the ones it would actually touch make the button worth showing.
  const has_unread = notifications.some((notification) => notification.is_unread && !notification.is_saved);
  const is_unfiltered_all =
    filters.tab === "all" && !filters.unread_only && !filters.search.trim() && !filters.board_id && !filters.actor_id;
  const openSummaryTab = (tab: NotificationTabId, unread_only: boolean) => onFiltersChange({ tab, unread_only });
  const threads = useMemo(() => grouped_notifications.flatMap((group) => group.threads), [grouped_notifications]);

  // A dismissed, snoozed or filtered-out notification can no longer be selected or focused.
  useEffect(() => {
    const known_ids = new Set(notifications.map((notification) => notification.id));
    setSelectedIds((previous) => {
      const kept = new Set([...previous].filter((id) => known_ids.has(id)));
      return kept.size === previous.size ? previous : kept;
    });
    setFocusedKey((previous) => (previous !== null && !known_ids.has(previous) ? null : previous));
  }, [notifications]);

  useEffect(() => {
    if (is_open) return;
    setIsSelecting(false);
    setSelectedIds(new Set());
    setFocusedKey(null);
  }, [is_open]);

  useEffect(() => {
    if (!focused_key) return;
    scroll_area_ref.current
      ?.querySelector(`[data-row-key="${CSS.escape(focused_key)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focused_key]);

  const toggleSelection = (ids: string[]) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const is_all_selected = ids.every((id) => next.has(id));
      ids.forEach((id) => (is_all_selected ? next.delete(id) : next.add(id)));
      return next;
    });

  const stopSelecting = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const runBulkAction = (action: NotificationBulkAction) => {
    onBulkAction?.(action, [...selected_ids]);
    stopSelecting();
  };

  // Keyboard shortcuts, live only while the drawer is open and nothing is being typed.
  useEffect(() => {
    if (!is_open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target) || threads.length === 0) return;

      const index = threads.findIndex((thread) => thread[0].id === focused_key);
      const focused_thread = index >= 0 ? threads[index] : null;
      const move = (next_index: number) => {
        event.preventDefault();
        setFocusedKey(threads[Math.min(Math.max(next_index, 0), threads.length - 1)][0].id);
      };

      if (event.key === "j") return move(index + 1);
      if (event.key === "k") return move(index === -1 ? 0 : index - 1);
      if (!focused_thread) return;

      const ids = focused_thread.map((notification) => notification.id);
      if (event.key === "x") {
        event.preventDefault();
        setIsSelecting(true);
        toggleSelection(ids);
      } else if (event.key === "o") {
        event.preventDefault();
        if (ids.length > 1) onSelectGroup(ids);
        else onSelectNotification(ids[0]);
      } else if (event.key === "u" && onBulkAction) {
        event.preventDefault();
        onBulkAction(focused_thread.some((notification) => notification.is_unread) ? "read" : "unread", ids);
      } else if (event.key === "s" && onBulkAction) {
        event.preventDefault();
        onBulkAction(focused_thread.every((notification) => notification.is_saved) ? "unsave" : "save", ids);
      } else if (event.key === "e" && onBulkAction) {
        event.preventDefault();
        // Leave the cursor on the neighbour that takes its place.
        const neighbour = threads[index + 1] ?? threads[index - 1];
        setFocusedKey(neighbour ? neighbour[0].id : null);
        onBulkAction("dismiss", ids);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, threads, focused_key, onBulkAction, onSelectGroup, onSelectNotification]);

  const runMoreMenuAction = (action: () => void) => () => {
    action();
    setIsMoreMenuOpen(false);
  };

  const renderEmptyState = () => {
    if (is_loading) return <p className="nc-list__status">Loading notifications...</p>;
    const is_saved_tab = filters.tab === "saved";
    return (
      <div className="nc-empty">
        <span className="nc-empty__icon">
          <BellIcon size={24} />
        </span>
        <span className="nc-empty__title">{is_saved_tab ? "Nothing saved yet" : "You're all caught up"}</span>
        <span>
          {is_saved_tab
            ? "Use the bookmark on a notification to keep it here."
            : "New mentions, replies and assignments will show up here."}
        </span>
      </div>
    );
  };

  return (
    <SlideOverDrawer is_open={is_open} onClose={onClose} aria_label="Notifications" width={DRAWER_WIDTH}>
      <div className="nc-panel">
        {/* Sticky header: title, actions, tabs, search + toggle */}
        <div className="nc-header">
          <div className="nc-header__top">
            <h2 className="nc-header__title">Notifications</h2>
            <div className="nc-header__actions">
              <button
                ref={preferences_trigger_ref}
                type="button"
                onClick={() => setIsPreferencesOpen((previous) => !previous)}
                className="nc-icon-button"
                aria-label="Notification settings"
                aria-expanded={is_preferences_open}
                title="Notification settings"
              >
                <NotificationSettingsGlyph size={19} />
              </button>
              <NotificationPreferencesPanel
                anchor_el={preferences_trigger_ref.current}
                is_open={is_preferences_open}
                onClose={() => setIsPreferencesOpen(false)}
              />
              <button
                ref={more_menu_trigger_ref}
                type="button"
                onClick={() => setIsMoreMenuOpen((previous) => !previous)}
                className="nc-icon-button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={is_more_menu_open}
                title="More actions"
              >
                <MoreDotsIcon size={20} />
              </button>
              <BoardPopover
                anchor_el={more_menu_trigger_ref.current}
                is_open={is_more_menu_open}
                onClose={() => setIsMoreMenuOpen(false)}
                width={232}
              >
                <div role="menu" className="nc-menu">
                  {onMarkAllAsRead && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!has_unread}
                      onClick={runMoreMenuAction(onMarkAllAsRead)}
                      className="nc-menu__item"
                    >
                      <CheckIcon size={15} />
                      Mark all as read
                    </button>
                  )}
                  {onBulkAction && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={notifications.length === 0}
                      onClick={runMoreMenuAction(() => (is_selecting ? stopSelecting() : setIsSelecting(true)))}
                      className="nc-menu__item"
                    >
                      <CheckCircleIcon size={15} />
                      {is_selecting ? "Stop selecting" : "Select notifications"}
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={runMoreMenuAction(toggleTheme)} className="nc-menu__item">
                    <SunIcon size={15} />
                    {resolved_theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  </button>
                </div>
              </BoardPopover>
              <span className="nc-header__divider" aria-hidden="true" />
              <button type="button" onClick={onClose} className="nc-icon-button" aria-label="Close notifications" title="Close">
                <CloseIcon size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Search + unread toggle */}
          <div className="nc-toolbar">
            <label className="nc-search">
              <SearchIcon size={16} />
              <span className="sr-only">Search notifications</span>
              <input
                type="text"
                value={search_text}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={notification_search_placeholder}
              />
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={filters.unread_only}
              onClick={() => onFiltersChange({ unread_only: !filters.unread_only })}
              className="nc-switch"
            >
              <span className="nc-switch__track">
                <span className="nc-switch__thumb" />
              </span>
              Unread only
            </button>
          </div>

          {/* Board and person filters */}
          <div className="nc-filters">
            <FilterMenu
              label="Board"
              all_label="All boards"
              options={filter_options.boards}
              selected_id={filters.board_id}
              onSelect={(board_id) => onFiltersChange({ board_id })}
            />
            <FilterMenu
              label="Person"
              all_label="Everyone"
              options={filter_options.actors}
              selected_id={filters.actor_id}
              onSelect={(actor_id) => onFiltersChange({ actor_id })}
            />
            {onMarkAllAsRead && has_unread && (
              <button type="button" onClick={onMarkAllAsRead} className="nc-text-button is-primary ml-auto">
                Mark all as read
              </button>
            )}
          </div>

          {/* Multi-select toolbar */}
          {is_selecting && (
            <div role="toolbar" aria-label="Selected notifications" className="nc-bulk-bar">
              <span className="nc-bulk-bar__count">{selected_ids.size} selected</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    selected_ids.size === notifications.length ? new Set() : new Set(notifications.map((notification) => notification.id))
                  )
                }
                className="nc-text-button"
              >
                {selected_ids.size === notifications.length ? "Select none" : "Select all"}
              </button>
              <span className="ml-auto flex flex-wrap items-center gap-1">
                <button type="button" disabled={selected_ids.size === 0} onClick={() => runBulkAction("read")} className="nc-text-button">
                  Mark read
                </button>
                <button type="button" disabled={selected_ids.size === 0} onClick={() => runBulkAction("unread")} className="nc-text-button">
                  Mark unread
                </button>
                <button
                  type="button"
                  disabled={selected_ids.size === 0}
                  onClick={() => runBulkAction(filters.tab === "saved" ? "unsave" : "save")}
                  className="nc-text-button"
                >
                  {filters.tab === "saved" ? "Unsave" : "Save"}
                </button>
                <button type="button" disabled={selected_ids.size === 0} onClick={() => runBulkAction("dismiss")} className="nc-text-button">
                  Dismiss
                </button>
                <button type="button" onClick={stopSelecting} className="nc-text-button is-primary">
                  Done
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Scrollable list, grouped by date and then by thread */}
        <div ref={scroll_area_ref} className="nc-list shell-scrollbar">
          {summary && is_unfiltered_all && (
            <div className="pt-4">
              <NotificationSummaryCard summary={summary} onOpenTab={openSummaryTab} />
            </div>
          )}

          {notifications.length === 0
            ? renderEmptyState()
            : grouped_notifications.map((group) => (
                <section key={group.id} className="nc-section" aria-label={group.label}>
                  <h3 className="nc-section__title">{group.label}</h3>
                  <div className="nc-section__items">
                    {group.threads.map((thread) => {
                      const ids = thread.map((notification) => notification.id);
                      const row_props = {
                        is_focused: thread[0].id === focused_key,
                        is_selecting,
                        is_selected: ids.every((id) => selected_ids.has(id)),
                      };
                      return (
                        <div key={thread[0].group_key} data-row-key={thread[0].id}>
                          {thread.length > 1 ? (
                            <NotificationGroupCard
                              notifications={thread}
                              onSelectGroup={onSelectGroup}
                              onSelect={onSelectNotification}
                              onDismiss={onDismissNotification}
                              onMarkRead={onMarkAsRead}
                              onMarkUnread={onMarkAsUnread}
                              onSnooze={onSnoozeNotification}
                              onSave={onSaveNotification}
                              onUnsave={onUnsaveNotification}
                              onReply={onReplyToNotification}
                              onMuteItem={onMuteNotificationItem}
                              onUnmuteItem={onUnmuteNotificationItem}
                              onToggleSelect={toggleSelection}
                              {...row_props}
                            />
                          ) : (
                            <NotificationItem
                              notification={thread[0]}
                              onSelect={onSelectNotification}
                              onDismiss={onDismissNotification}
                              onMarkRead={onMarkAsRead}
                              onMarkUnread={onMarkAsUnread}
                              onSnooze={onSnoozeNotification}
                              onSave={onSaveNotification}
                              onUnsave={onUnsaveNotification}
                              onReply={onReplyToNotification}
                              onMuteItem={onMuteNotificationItem}
                              onUnmuteItem={onUnmuteNotificationItem}
                              onToggleSelect={(id) => toggleSelection([id])}
                              {...row_props}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

          {/* Sentinel: reaching it loads the next page. */}
          <div ref={sentinel_ref} aria-hidden="true" className="h-px" />
          {is_loading_more && <p className="nc-list__status">Loading more...</p>}
          {onBulkAction && notifications.length > 0 && (
            <p className="nc-list__hint hidden md:block">
              Keyboard: j and k move, o opens, e dismisses, u marks read or unread, s saves, x selects.
            </p>
          )}
        </div>
      </div>
    </SlideOverDrawer>
  );
};

export default NotificationsPanel;
