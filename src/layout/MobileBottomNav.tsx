"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { BellIcon, FeedIcon, HomeIcon, WorkspaceRailIcon } from "@/icons/workspace-icons";
import { CalendarViewIcon } from "@/icons/board-icons";
import { HOME_PATH, isSidebarlessPath } from "./sidebar-routes";
import "./mobile-bottom-nav.scss";

const MY_WORK_PATH = "/my-work";
const ICON_SIZE = 22;

type MobileBottomNavProps = {
  unread_notifications: number;
  unread_updates: number;
  is_notifications_open: boolean;
  is_feed_open: boolean;
  onOpenNotifications: () => void;
  onOpenFeed: () => void;
};

type NavTab = {
  key: string;
  label: string;
  icon: React.ReactNode;
  is_active: boolean;
  badge?: number;
  href?: string;
  onSelect?: () => void;
};

const formatBadge = (count: number): string => (count > 99 ? "99+" : String(count));

/**
 * Thumb reach tab bar for phones, modeled on the monday.com mobile app: Home,
 * My work, the workspace tree, the notifications inbox and the update feed,
 * always one tap away at the bottom of the screen. Only rendered on phones
 * (see `mobile-bottom-nav.scss`); tablets and desktops keep the app rail.
 *
 * It owns no data: `AppTopBar` passes the unread counts and panel openers it
 * already has, so nothing is fetched twice.
 */
const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  unread_notifications,
  unread_updates,
  is_notifications_open,
  is_feed_open,
  onOpenNotifications,
  onOpenFeed,
}) => {
  const pathname = usePathname() ?? "";
  const { isMobileOpen, toggleMobileSidebar, closeMobileSidebar } = useSidebar();
  const has_workspace_sidebar = !isSidebarlessPath(pathname);
  const is_panel_open = is_notifications_open || is_feed_open || isMobileOpen;

  const tabs: NavTab[] = [
    {
      key: "home",
      label: "Home",
      icon: <HomeIcon size={ICON_SIZE} />,
      href: HOME_PATH,
      is_active: !is_panel_open && pathname.startsWith(HOME_PATH),
    },
    {
      key: "my-work",
      label: "My work",
      icon: <CalendarViewIcon size={ICON_SIZE} />,
      href: MY_WORK_PATH,
      is_active: !is_panel_open && pathname.startsWith(MY_WORK_PATH),
    },
    ...(has_workspace_sidebar
      ? [
          {
            key: "workspace",
            label: "Workspace",
            icon: <WorkspaceRailIcon size={ICON_SIZE} />,
            onSelect: toggleMobileSidebar,
            is_active: isMobileOpen,
          },
        ]
      : []),
    {
      key: "inbox",
      label: "Inbox",
      icon: <BellIcon size={ICON_SIZE} />,
      onSelect: onOpenNotifications,
      is_active: is_notifications_open,
      badge: unread_notifications,
    },
    {
      key: "updates",
      label: "Updates",
      icon: <FeedIcon size={ICON_SIZE} />,
      onSelect: onOpenFeed,
      is_active: is_feed_open,
      badge: unread_updates,
    },
  ];

  const renderTabBody = (tab: NavTab) => (
    <>
      <span className="mobile-bottom-nav__icon">
        {tab.icon}
        {tab.badge ? (
          <span className="mobile-bottom-nav__badge" aria-hidden="true">
            {formatBadge(tab.badge)}
          </span>
        ) : null}
      </span>
      <span className="mobile-bottom-nav__label">{tab.label}</span>
    </>
  );

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      <ul className="mobile-bottom-nav__list">
        {tabs.map((tab) => {
          const accessible_label = tab.badge ? `${tab.label}, ${formatBadge(tab.badge)} unread` : tab.label;
          return (
            <li key={tab.key} className="mobile-bottom-nav__item">
              {tab.href ? (
                <Link
                  href={tab.href}
                  className="mobile-bottom-nav__tab"
                  data-active={tab.is_active || undefined}
                  aria-current={tab.is_active ? "page" : undefined}
                  aria-label={accessible_label}
                  onClick={closeMobileSidebar}
                >
                  {renderTabBody(tab)}
                </Link>
              ) : (
                <button
                  type="button"
                  className="mobile-bottom-nav__tab"
                  data-active={tab.is_active || undefined}
                  aria-pressed={tab.is_active}
                  aria-label={accessible_label}
                  onClick={tab.onSelect}
                >
                  {renderTabBody(tab)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
