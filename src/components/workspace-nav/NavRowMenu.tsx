"use client";
import React from "react";
import { MenuItemList, type MenuListItem } from "@/components/ui/dropdown/MenuItemList";

export type NavMenuItem = MenuListItem;

export type NavRowMenuProps = {
  is_open: boolean;
  x: number;
  y: number;
  title?: string;
  items: NavMenuItem[];
  onClose: () => void;
};

/**
 * A fixed-position popover menu shared by the tree's kebab actions and the
 * "add at root" control. Presentational: the caller supplies the item list.
 */
const NavRowMenu: React.FC<NavRowMenuProps> = ({ is_open, x, y, title, items, onClose }) => {
  if (!is_open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        className="fixed z-[1000] w-[214px] rounded-xl border border-shell-border bg-shell-panel p-1.5 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <MenuItemList
          title={title}
          items={items}
          onSelect={(item) => {
            onClose();
            item.onClick();
          }}
        />
      </div>
    </>
  );
};

export default NavRowMenu;
