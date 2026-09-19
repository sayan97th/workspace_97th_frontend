"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { useTheme } from "@/context/ThemeContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import SlideOverDrawer from "./SlideOverDrawer";
import NotificationGroupCard from "./NotificationGroupCard";
import NotificationItem from "./NotificationItem";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import { ChevronDownIcon, CloseIcon, MoreDotsIcon, SearchIcon, SunIcon } from "@/icons/workspace-icons";
import {
  notification_date_groups,
  notificationDateGroupOf,
  notification_search_placeholder,
  notification_tabs,
  type NotificationDateGroup,
  type NotificationFilterOption,
  type NotificationFilterOptions,
  type NotificationFilters,
  type NotificationSnoozePresetId,
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
};

const SEARCH_DEBOUNCE_MS = 300;

type FilterMenuProps = {
  label: string;
  all_label: string;
  options: NotificationFilterOption[];
  selected_id: string | null;
  onSelect: (id: string | null) => void;
};

/** A compact dropdown chip that narrows the list to one board or one person. */
const FilterMenu: React.FC<FilterMenuProps> = ({ label, all_label, options, selected_id, onSelect }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const selected = options.find((option) => option.id === selected_id);

  const choose = (id: string | null) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={`flex max-w-[150px] items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
          selected
            ? "border-brand-500 text-shell-text"
            : "border-shell-border text-shell-text-muted hover:text-shell-text"
        }`}
      >
        <span className="truncate">{selected?.name ?? label}</span>
        <ChevronDownIcon size={10} className="flex-none" />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={220} align="start">
        <div role="listbox" className="shell-scrollbar max-h-[260px] overflow-y-auto p-1.5">
          {[{ id: null, name: all_label }, ...options].map((option) => (
            <button
              key={option.id ?? "all"}
              type="button"
              role="option"
              aria-selected={option.id === selected_id}
              onClick={() => choose(option.id)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-shell-hover ${
                option.id === selected_id ? "font-semibold text-shell-text" : "font-medium text-shell-text-secondary"
              }`}
            >
              <span className="truncate">{option.name}</span>
            </button>
          ))}
        </div>
      </BoardPopover>
    </>
  );
};

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
 * "Mentioned", "Assigned to me", "Replies" and "Reactions" tabs, a search box,
 * board and person filters, an "unread only" toggle and the notification list,
 * grouped by date and then by thread. Filtering happens server-side and the
 * list pages in as it is scrolled, both driven by `useNotifications`, this
 * component only renders them.
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
}) => {
  const { resolved_theme, toggleTheme } = useTheme();
  const [search_text, setSearchText] = useState(filters.search);
  const [is_preferences_open, setIsPreferencesOpen] = useState(false);
  const preferences_trigger_ref = useRef<HTMLButtonElement>(null);
  const scroll_area_ref = useRef<HTMLDivElement>(null);

  // The board and person menus only list what actually appears in the user's
  // notifications, refreshed each time the drawer opens.
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

  const has_unread = notifications.some((notification) => notification.is_unread);

  const header_icon_button =
    "flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover";

  return (
    <SlideOverDrawer is_open={is_open} onClose={onClose} aria_label="Notifications">
      {/* Sticky header: title, actions, tabs, search + toggle */}
      <div className="flex-none px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-[-0.01em]">Notifications</h2>
          <div className="flex items-center gap-0.5">
            {onMarkAllAsRead && has_unread && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="mr-1 rounded-[7px] px-2 py-1.5 text-[12px] font-semibold text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
              >
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className={header_icon_button}
              aria-label={resolved_theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <SunIcon size={16} />
            </button>
            <button
              ref={preferences_trigger_ref}
              type="button"
              onClick={() => setIsPreferencesOpen((previous) => !previous)}
              className={header_icon_button}
              aria-label="Notification settings"
            >
              <MoreDotsIcon size={16} />
            </button>
            <NotificationPreferencesPanel
              anchor_el={preferences_trigger_ref.current}
              is_open={is_preferences_open}
              onClose={() => setIsPreferencesOpen(false)}
            />
            <button
              type="button"
              onClick={onClose}
              className={header_icon_button}
              aria-label="Close notifications"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shell-scrollbar mt-4 flex gap-[14px] overflow-x-auto border-b border-shell-border">
          {notification_tabs.map((tab) => {
            const is_active = tab.id === filters.tab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFiltersChange({ tab: tab.id })}
                className={`-mb-px flex-none cursor-pointer whitespace-nowrap border-b-2 pb-[11px] text-[13px] transition-colors ${
                  is_active
                    ? "border-brand-500 font-semibold text-shell-text"
                    : "border-transparent font-medium text-shell-text-muted hover:text-shell-text"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + unread toggle */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-[9px] rounded-[9px] border border-shell-border bg-shell-panel-alt px-3 py-[9px] text-shell-text-muted focus-within:border-brand-500">
            <SearchIcon size={14} />
            <input
              type="text"
              value={search_text}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={notification_search_placeholder}
              className="w-full bg-transparent text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:outline-none"
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={filters.unread_only}
            onClick={() => onFiltersChange({ unread_only: !filters.unread_only })}
            className="flex flex-none items-center gap-2 text-[12.5px] font-medium text-shell-text-secondary"
          >
            <span
              className={`relative h-[19px] w-[34px] flex-none rounded-full transition-colors ${
                filters.unread_only ? "bg-brand-500" : "bg-shell-hover-strong"
              }`}
            >
              <span
                className={`absolute top-[2px] h-[15px] w-[15px] rounded-full transition-all ${
                  filters.unread_only ? "left-[17px] bg-white" : "left-[2px] bg-shell-text-muted"
                }`}
              />
            </span>
            Unread only
          </button>
        </div>

        {/* Board and person filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* Scrollable list, grouped by date and then by thread */}
      <div ref={scroll_area_ref} className="shell-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-[18px]">
        {notifications.length === 0 ? (
          <p className="pt-6 text-center text-[13px] text-shell-text-muted">
            {is_loading ? "Loading notifications…" : "You're all caught up."}
          </p>
        ) : (
          grouped_notifications.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <div className="mb-3 text-[12.5px] font-semibold text-shell-text-muted">{group.label}</div>
              <div className="flex flex-col gap-2.5">
                {group.threads.map((thread) =>
                  thread.length > 1 ? (
                    <NotificationGroupCard
                      key={thread[0].group_key}
                      notifications={thread}
                      onSelectGroup={onSelectGroup}
                      onSelect={onSelectNotification}
                      onDismiss={onDismissNotification}
                      onMarkRead={onMarkAsRead}
                      onMarkUnread={onMarkAsUnread}
                      onSnooze={onSnoozeNotification}
                    />
                  ) : (
                    <NotificationItem
                      key={thread[0].id}
                      notification={thread[0]}
                      onSelect={onSelectNotification}
                      onDismiss={onDismissNotification}
                      onMarkRead={onMarkAsRead}
                      onMarkUnread={onMarkAsUnread}
                      onSnooze={onSnoozeNotification}
                    />
                  )
                )}
              </div>
            </div>
          ))
        )}

        {/* Sentinel: reaching it loads the next page. */}
        <div ref={sentinel_ref} aria-hidden="true" className="h-px" />
        {is_loading_more && <p className="pt-3 text-center text-[12.5px] text-shell-text-muted">Loading more…</p>}
      </div>
    </SlideOverDrawer>
  );
};

export default NotificationsPanel;
