"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon, StarIcon } from "@/icons/workspace-icons";
import { CalendarViewIcon } from "@/icons/board-icons";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import useFavorites from "@/hooks/useFavorites";
import type { FavoriteItemDto } from "@/types/personal";

const COLLAPSED_STORAGE_KEY = "sidebar_favorites_collapsed";

/** Where a favorite opens: a board at its own page, a folder at its workspace. */
const favoriteHref = (favorite: FavoriteItemDto): string =>
  favorite.type === "leaf" ? `/boards/${favorite.id}` : favorite.workspace ? `/workspaces/${favorite.workspace.id}` : "/workspace-home";

const ROW_CLASS = "group relative flex h-[34px] items-center gap-[11px] rounded-[9px] px-2.5 text-sm transition-colors hover:bg-shell-hover";

/**
 * The sidebar's personal block, above the workspace tree: Home, My work and
 * the user's own Favorites (starred from the board header or the tree's
 * item menu). Favorites can be reordered by dragging.
 */
const SidebarPersonalNav: React.FC = () => {
  const pathname = usePathname();
  const { favorites, is_loading, removeFavorite, moveFavorite } = useFavorites();
  const [is_collapsed, setIsCollapsed] = useState(false);
  const [dragging_id, setDraggingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked, the section just starts expanded.
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, current ? "0" : "1");
      } catch {
        // Not remembered across reloads, nothing else breaks.
      }
      return !current;
    });
  };

  const renderLink = (href: string, label: string, icon: React.ReactNode, is_active: boolean) => (
    <Link href={href} className={`${ROW_CLASS} ${is_active ? "bg-shell-hover font-semibold text-shell-text" : "text-shell-text"}`} aria-current={is_active ? "page" : undefined}>
      <span className="flex flex-none text-shell-text-secondary">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-0.5 border-b border-shell-border px-2.5 pb-2.5 pt-1">
      {renderLink("/workspace-home", "Home", <HomeIcon size={16} />, pathname === "/workspace-home")}
      {renderLink("/my-work", "My work", <CalendarViewIcon size={16} />, pathname === "/my-work")}

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!is_collapsed}
        className={`${ROW_CLASS} w-full text-left text-shell-text`}
      >
        <span className="flex flex-none text-shell-text-secondary">
          <StarIcon size={16} />
        </span>
        <span className="flex-1 truncate">Favorites</span>
        <span className={`flex flex-none text-shell-text-muted transition-transform duration-150 ${is_collapsed ? "" : "rotate-90"}`}>
          <ChevronRightIcon size={11} />
        </span>
      </button>

      {!is_collapsed && (
        <ul className="flex flex-col" aria-label="Favorites">
          {!is_loading && favorites.length === 0 && (
            <li className="px-2.5 py-1.5 pl-[38px] text-[12.5px] leading-snug text-shell-text-faint">
              Star a board to keep it here.
            </li>
          )}
          {favorites.map((favorite, index) => {
            const href = favoriteHref(favorite);
            const is_active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li
                key={favorite.id}
                draggable
                onDragStart={(event) => {
                  setDraggingId(favorite.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  if (dragging_id !== null) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging_id !== null) void moveFavorite(dragging_id, index);
                  setDraggingId(null);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={dragging_id === favorite.id ? "opacity-40" : ""}
              >
                <div className={`${ROW_CLASS} pl-[34px] ${is_active ? "bg-shell-hover" : ""}`}>
                  <Link href={href} className="flex min-w-0 flex-1 items-center gap-2" title={favorite.workspace ? `${favorite.label} in ${favorite.workspace.name}` : favorite.label}>
                    <WorkspaceMonogram workspace={favorite.workspace} size={16} />
                    <span className="truncate text-shell-text">{favorite.label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeFavorite(favorite.id)}
                    aria-label={`Remove ${favorite.label} from favorites`}
                    title="Remove from favorites"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-sunset-200 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-shell-hover-strong"
                  >
                    <StarIcon filled size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SidebarPersonalNav;
