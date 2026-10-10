"use client";
import React, { useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { ClockIcon, MoreDotsIcon, SortIcon } from "@/icons/workspace-icons";
import useFavorites from "@/hooks/useFavorites";
import { SIDEBAR_ICON_BUTTON_CLASS } from "./sidebarConstants";

const MENU_ROW_CLASS =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-sidebar-text transition-colors hover:bg-sidebar-hover disabled:cursor-default disabled:text-sidebar-text-secondary disabled:hover:bg-transparent";

export type SidebarFavoritesOptionsButtonProps = {
  is_recent_visible: boolean;
  onToggleRecent: () => void;
};

/** "..." of the Favorites panel header: sort the favorites A to Z, show or hide "Recently viewed". */
const SidebarFavoritesOptionsButton: React.FC<SidebarFavoritesOptionsButtonProps> = ({ is_recent_visible, onToggleRecent }) => {
  const { favorites, sortFavoritesByLabel } = useFavorites();
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchorEl(anchor_el ? null : event.currentTarget)}
        className={`${SIDEBAR_ICON_BUTTON_CLASS} ${anchor_el ? "bg-sidebar-hover text-sidebar-text" : ""}`}
        aria-label="Favorites options"
        aria-haspopup="menu"
        aria-expanded={anchor_el !== null}
        title="Favorites options"
      >
        <MoreDotsIcon size={18} />
      </button>

      <BoardPopover anchor_el={anchor_el} is_open={anchor_el !== null} onClose={closeMenu} width={260} align="start">
        <div className="flex flex-col p-1.5" role="menu" aria-label="Favorites options">
          <button
            type="button"
            role="menuitem"
            disabled={favorites.length < 2}
            onClick={() => {
              closeMenu();
              void sortFavoritesByLabel();
            }}
            className={MENU_ROW_CLASS}
          >
            <span className="flex flex-none text-sidebar-text-secondary">
              <SortIcon size={16} />
            </span>
            Sort A to Z
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={is_recent_visible} onClick={onToggleRecent} className={MENU_ROW_CLASS}>
            <span className="flex flex-none text-sidebar-text-secondary">
              <ClockIcon size={16} />
            </span>
            <span className="flex-1 whitespace-nowrap">Show recently viewed</span>
            <span
              aria-hidden="true"
              className={`relative h-[18px] w-8 flex-none rounded-full transition-colors ${is_recent_visible ? "bg-sidebar-focus" : "bg-sidebar-control-border"}`}
            >
              <span
                className={`absolute left-0 top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-150 ${
                  is_recent_visible ? "translate-x-[16px]" : "translate-x-[2px]"
                }`}
              />
            </span>
          </button>
        </div>
      </BoardPopover>
    </>
  );
};

export default SidebarFavoritesOptionsButton;
