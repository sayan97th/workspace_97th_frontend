"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon } from "@/icons/workspace-icons";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import NavItemIcon, { NavPrivacyBadge } from "@/components/workspace-nav/NavItemIcon";
import useRecentBoards from "@/hooks/useRecentBoards";
import { SIDEBAR_ROW_ACTIVE_CLASS, SIDEBAR_ROW_CLASS, isPathActive } from "./sidebarConstants";

/** How many recently visited boards the Recent panel lists. */
const RECENT_LIMIT = 15;

/** Body of the sidebar panel while the rail's Recent entry is selected: the boards the user opened last. */
const SidebarRecentList: React.FC = () => {
  const pathname = usePathname() ?? "";
  const { boards, is_loading } = useRecentBoards(true);
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
      {visible_boards.map((board) => {
        const href = `/boards/${board.id}`;
        const is_active = isPathActive(pathname, href);
        return (
          <li key={board.id}>
            <Link
              href={href}
              className={`${SIDEBAR_ROW_CLASS} ${is_active ? SIDEBAR_ROW_ACTIVE_CLASS : ""}`}
              title={board.workspace ? `${board.label} in ${board.workspace.name}` : board.label}
              aria-current={is_active ? "page" : undefined}
            >
              <NavItemIcon source={board} size={16} className="text-sidebar-text-secondary" />
              <span className="min-w-0 flex-1 truncate">{board.label}</span>
              <NavPrivacyBadge board_type={board.board_type} className="text-sidebar-text-secondary" />
              <WorkspaceMonogram workspace={board.workspace} size={16} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarRecentList;
