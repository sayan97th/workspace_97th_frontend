import React from "react";
import Link from "next/link";
import UserAvatar from "@/components/common/UserAvatar";
import NavItemIcon from "@/components/workspace-nav/NavItemIcon";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import WorkspaceBadge from "@/layout/WorkspaceBadge";
import { favoriteHref } from "@/layout/SidebarFavoritesList";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";
import type { NotificationDto } from "@/types/notifications";
import type { FavoriteItemDto } from "@/types/personal";
import { relativeTime } from "./homeSummary";

const ListSkeleton: React.FC<{ rows?: number; height?: number }> = ({ rows = 3, height = 36 }) => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="home-skeleton" style={{ height }} />
    ))}
  </div>
);

const EmptyNote: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="home-empty">
    <span className="text-[20px]" aria-hidden="true">
      {icon}
    </span>
    <span>{children}</span>
  </p>
);

/** The newest unread notifications, each opening what it is about. */
export const HomeInboxList: React.FC<{ notifications: NotificationDto[] | null; onOpenInbox: () => void }> = ({
  notifications,
  onOpenInbox,
}) => {
  if (notifications === null) return <ListSkeleton height={48} />;
  if (notifications.length === 0) return <EmptyNote icon="🎉">You&apos;re all caught up. No unread notifications.</EmptyNote>;

  return (
    <>
      <ul className="flex flex-col">
        {notifications.map((notification) => {
          const content = (
            <>
              <UserAvatar
                user={{ full_name: notification.actor.name, profile_photo_url: notification.actor.avatar_url ?? null }}
                size={32}
                font_size={12}
                className={`flex-none ${notification.actor.is_deactivated ? "opacity-50 grayscale" : ""}`}
              />
              <span className="min-w-0 flex-1">
                <span className="home-inbox-text line-clamp-2">
                  <span className="font-semibold">{notification.actor.name}</span> {notification.action_label}{" "}
                  <span className="font-medium">{notification.action_target}</span>
                </span>
                <span className="home-inbox-meta block truncate">
                  {notification.board?.name ? `${notification.board.name} · ` : ""}
                  {relativeTime(notification.created_at)}
                </span>
              </span>
              <span className="home-unread-dot" aria-label="Unread" />
            </>
          );
          return (
            <li key={notification.id}>
              {notification.link ? (
                <Link href={notification.link} className="home-list-row home-inbox-row">
                  {content}
                </Link>
              ) : (
                <div className="home-list-row home-inbox-row">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className="home-full-button" onClick={onOpenInbox}>
        Open inbox
      </button>
    </>
  );
};

/** The user's starred boards and folders, in their own order. */
export const HomeFavoritesList: React.FC<{ favorites: FavoriteItemDto[] | null }> = ({ favorites }) => {
  if (favorites === null) return <ListSkeleton />;
  if (favorites.length === 0) {
    return <EmptyNote icon="⭐">Star a board to keep it one click away. Use the star on any board card.</EmptyNote>;
  }

  return (
    <ul className="flex flex-col">
      {favorites.map((favorite) => (
        <li key={favorite.id}>
          <Link href={favoriteHref(favorite)} className="home-list-row" title={favorite.label}>
            <NavItemIcon source={favorite} size={16} className="text-[var(--home-text-secondary)]" />
            <span className="min-w-0 flex-1 truncate">{favorite.label}</span>
            {favorite.workspace && <WorkspaceMonogram workspace={favorite.workspace} size={16} />}
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** Workspaces the user belongs to, each opening its Manage page. */
export const HomeWorkspacesList: React.FC<{ workspaces: BrowseWorkspace[] }> = ({ workspaces }) => {
  if (workspaces.length === 0) return <EmptyNote icon="🏠">You haven&apos;t joined a workspace yet.</EmptyNote>;

  return (
    <ul className="flex flex-col">
      {workspaces.map((workspace) => (
        <li key={workspace.id}>
          <Link href={buildWorkspaceManagePath(Number(workspace.id))} className="home-list-row">
            <WorkspaceBadge workspace={workspace} size={28} notchColor="var(--home-surface)" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{workspace.name}</span>
              {workspace.role && <span className="block truncate text-[12px] text-[var(--home-text-faint)]">{workspace.role}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
