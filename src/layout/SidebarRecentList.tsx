"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon, StarIcon } from "@/icons/workspace-icons";
import NavItemIcon from "@/components/workspace-nav/NavItemIcon";
import useFavorites from "@/hooks/useFavorites";
import useRecentBoards from "@/hooks/useRecentBoards";
import { SIDEBAR_ROW_ACTIVE_CLASS, SIDEBAR_ROW_CLASS, isPathActive } from "./sidebarConstants";
import type { RecentBoardDto } from "@/types/personal";

/** How many recently visited boards the Recent panel lists. */
const RECENT_LIMIT = 15;

type RecentBoardRowProps = {
  board: RecentBoardDto;
  is_active: boolean;
  is_favorite: boolean;
  onToggleFavorite: () => void;
};

/**
 * One recently opened board, like monday.com's "Recently viewed": its icon and
 * name, with a star at the end that adds it to (or removes it from) Favorites.
 */
export const RecentBoardRow: React.FC<RecentBoardRowProps> = ({ board, is_active, is_favorite, onToggleFavorite }) => {
  const href = `/boards/${board.id}`;
  return (
    <li className={`${SIDEBAR_ROW_CLASS} pr-1 ${is_active ? SIDEBAR_ROW_ACTIVE_CLASS : ""}`}>
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-[11px] self-stretch outline-none"
        title={board.workspace ? `${board.label} in ${board.workspace.name}` : board.label}
        aria-current={is_active ? "page" : undefined}
      >
        <NavItemIcon source={board} size={16} className="text-sidebar-text-secondary" />
        <span className="min-w-0 truncate">{board.label}</span>
      </Link>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={is_favorite}
        aria-label={is_favorite ? `Remove ${board.label} from favorites` : `Add ${board.label} to favorites`}
        title={is_favorite ? "Remove from favorites" : "Add to favorites"}
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-md transition-colors hover:bg-sidebar-hover ${
          is_favorite ? "text-[#ffcb00]" : "text-sidebar-text hover:text-[#ffcb00]"
        }`}
      >
        <StarIcon filled={is_favorite} size={15} />
      </button>
    </li>
  );
};

/** Starred state and toggle for recent boards, read from the shared Favorites store so every star stays in sync. */
export const useRecentFavoriteToggle = () => {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const favorite_ids = new Set(favorites.map((favorite) => favorite.id));

  const toggleFavorite = (board: RecentBoardDto) => {
    if (favorite_ids.has(board.id)) {
      void removeFavorite(board.id);
      return;
    }
    void addFavorite({ id: board.id, label: board.label, type: "leaf", view_key: board.view_key, board_type: board.board_type, workspace: board.workspace });
  };

  return { isFavorite: (board_id: number) => favorite_ids.has(board_id), toggleFavorite };
};

/** Body of the sidebar panel while the rail's Recent entry is selected: the boards the user opened last. */
const SidebarRecentList: React.FC = () => {
  const pathname = usePathname() ?? "";
  const { boards, is_loading } = useRecentBoards(true);
  const { isFavorite, toggleFavorite } = useRecentFavoriteToggle();
  const visible_boards = boards.slice(0, RECENT_LIMIT);

  if (is_loading && visible_boards.length === 0) {
    return (
      <div className="space-y-1.5 px-2 py-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-8 animate-pulse rounded-md bg-sidebar-hover" />
        ))}
      </div>
    );
  }

  if (visible_boards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-rail text-sidebar-text-secondary">
          <ClockIcon size={20} />
        </span>
        <p className="text-sm font-medium text-sidebar-text">Nothing here yet</p>
        <p className="text-[13px] leading-snug text-sidebar-text-secondary">Boards you open will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col" aria-label="Recently visited boards">
      {visible_boards.map((board) => (
        <RecentBoardRow
          key={board.id}
          board={board}
          is_active={isPathActive(pathname, `/boards/${board.id}`)}
          is_favorite={isFavorite(board.id)}
          onToggleFavorite={() => toggleFavorite(board)}
        />
      ))}
    </ul>
  );
};

export default SidebarRecentList;
