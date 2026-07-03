"use client";
import React, { useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import SlideOverDrawer from "./SlideOverDrawer";
import NotificationItem from "./NotificationItem";
import { CloseIcon, MoreDotsIcon, SearchIcon, SunIcon } from "@/icons/workspace-icons";
import {
  notification_group_label,
  notification_mute_hint,
  notification_search_placeholder,
  notification_tabs,
  workspace_notifications,
  type NotificationTabId,
  type WorkspaceNotification,
} from "@/data/notifications-data";

type NotificationsPanelProps = {
  is_open: boolean;
  onClose: () => void;
  notifications?: WorkspaceNotification[];
};

/** Keeps a notification only when it matches the currently active tab. */
const matchesTab = (
  notification: WorkspaceNotification,
  tab: NotificationTabId
): boolean => {
  if (tab === "all") return true;
  return notification.category === tab;
};

/** Keeps a notification only when actor or board matches the search query. */
const matchesQuery = (
  notification: WorkspaceNotification,
  query: string
): boolean => {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    notification.actor.name.toLowerCase().includes(needle) ||
    notification.board.name.toLowerCase().includes(needle)
  );
};

/**
 * Notifications drawer opened from the AppTopBar bell. Shows the "All",
 * "Mentioned" and "Assigned to me" tabs, a search box, an "unread only" toggle,
 * a dismissible board-mute hint and the filtered notification list. Presentation
 * only — data is injected so it can be wired to the API later.
 */
const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  is_open,
  onClose,
  notifications = workspace_notifications,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [active_tab, setActiveTab] = useState<NotificationTabId>("all");
  const [search_query, setSearchQuery] = useState("");
  const [unread_only, setUnreadOnly] = useState(false);
  const [is_hint_visible, setIsHintVisible] = useState(true);

  const visible_notifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          matchesTab(notification, active_tab) &&
          matchesQuery(notification, search_query) &&
          (!unread_only || notification.is_unread)
      ),
    [notifications, active_tab, search_query, unread_only]
  );

  const header_icon_button =
    "flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#9aa4a5] transition-colors hover:bg-white/[0.08]";

  return (
    <SlideOverDrawer is_open={is_open} onClose={onClose} aria_label="Notifications">
      {/* Sticky header: title, actions, tabs, search + toggle, mute hint */}
      <div className="flex-none px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-[-0.01em]">Notifications</h2>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              className={header_icon_button}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <SunIcon size={16} />
            </button>
            <button type="button" className={header_icon_button} aria-label="Notification settings">
              <MoreDotsIcon size={16} />
            </button>
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
        <div className="mt-4 flex gap-[22px] border-b border-white/[0.08]">
          {notification_tabs.map((tab) => {
            const is_active = tab.id === active_tab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px cursor-pointer border-b-2 pb-[11px] text-sm transition-colors ${
                  is_active
                    ? "border-brand-500 font-semibold text-[#e9eded]"
                    : "border-transparent font-medium text-[#8a9495] hover:text-[#e9eded]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + unread toggle */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-[9px] rounded-[9px] border border-white/[0.08] bg-[#142020] px-3 py-[9px] text-[#8a9495] focus-within:border-brand-500">
            <SearchIcon size={14} />
            <input
              type="text"
              value={search_query}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={notification_search_placeholder}
              className="w-full bg-transparent text-[12.5px] text-[#e9eded] placeholder:text-[#8a9495] focus:outline-none"
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={unread_only}
            onClick={() => setUnreadOnly((previous) => !previous)}
            className="flex flex-none items-center gap-2 text-[12.5px] font-medium text-[#b4bcbd]"
          >
            <span
              className={`relative h-[19px] w-[34px] flex-none rounded-full transition-colors ${
                unread_only ? "bg-brand-500" : "bg-white/[0.14]"
              }`}
            >
              <span
                className={`absolute top-[2px] h-[15px] w-[15px] rounded-full transition-all ${
                  unread_only ? "left-[17px] bg-white" : "left-[2px] bg-[#8a9495]"
                }`}
              />
            </span>
            Unread only
          </button>
        </div>

        {/* Dismissible board-mute hint */}
        {is_hint_visible && (
          <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-white/[0.06] bg-[#142020] p-3">
            <span
              className="h-[38px] w-[44px] flex-none rounded-[7px] border border-white/[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(120deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 10px)",
              }}
              aria-hidden="true"
            />
            <span className="flex-1 text-[12.5px] leading-[1.5] text-[#b4bcbd]">
              {notification_mute_hint}
            </span>
            <button
              type="button"
              onClick={() => setIsHintVisible(false)}
              className="flex-none text-[#8a9495] transition-colors hover:text-[#e9eded]"
              aria-label="Dismiss hint"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div className="shell-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-[18px]">
        <div className="mb-3 text-[12.5px] font-semibold text-[#8a9495]">
          {notification_group_label}
        </div>
        {visible_notifications.length === 0 ? (
          <p className="pt-6 text-center text-[13px] text-[#8a9495]">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible_notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </SlideOverDrawer>
  );
};

export default NotificationsPanel;
