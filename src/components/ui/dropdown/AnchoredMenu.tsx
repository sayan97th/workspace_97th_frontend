"use client";
import React from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { MenuItemList, type MenuListItem } from "@/components/ui/dropdown/MenuItemList";

export type AnchoredMenuItem = MenuListItem;

export type AnchoredMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  title?: string;
  items: AnchoredMenuItem[];
  width?: number;
  align?: "start" | "end";
};

/**
 * Generic "…" options menu anchored to a trigger button (unlike {@link NavRowMenu},
 * which is positioned by an explicit x/y from a row's kebab click). Wraps
 * {@link BoardPopover} for anchor-based positioning/outside-click/Escape and
 * {@link MenuItemList} for the icon+label row styling, so any future single-anchor
 * "…" menu (workspace options, board header, etc.) can reuse this instead of
 * hand-rolling another fixed-position popover.
 */
const AnchoredMenu: React.FC<AnchoredMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  title,
  items,
  width = 220,
  align = "end",
}) => (
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align}>
    <div className="p-1.5">
      <MenuItemList
        title={title}
        items={items}
        onSelect={(item) => {
          onClose();
          item.onClick();
        }}
      />
    </div>
  </BoardPopover>
);

export default AnchoredMenu;
