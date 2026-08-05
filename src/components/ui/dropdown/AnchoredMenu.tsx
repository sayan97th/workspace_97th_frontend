"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
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
 * Generic "…" options menu anchored to a trigger button. Wraps
 * {@link BoardPopover} for anchor-based positioning/outside-click/Escape (it
 * measures the trigger's real position and the menu's real rendered size, so
 * it always lands next to the click instead of guessing an offset) and
 * {@link MenuItemList} for the icon+label row styling, so any future single-anchor
 * "…" menu (workspace options, nav tree rows, board header, etc.) can reuse
 * this instead of hand-rolling another fixed-position popover.
 *
 * An item with `.submenu` opens a nested {@link MenuFlyout} off that row
 * instead of firing its own `onClick` — the parent menu stays open, and
 * picking a submenu row closes both.
 */
const AnchoredMenu: React.FC<AnchoredMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  title,
  items,
  width = 220,
  align = "end",
}) => {
  const [open_submenu_key, setOpenSubmenuKey] = useState<string | null>(null);
  const item_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const open_submenu_item = items.find((item) => item.key === open_submenu_key);

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align}>
      <div className="p-1.5">
        <MenuItemList
          title={title}
          items={items}
          getItemRef={(key) => (el) => {
            item_refs.current[key] = el;
          }}
          onSelect={(item) => {
            if (item.submenu) {
              setOpenSubmenuKey((current) => (current === item.key ? null : item.key));
              return;
            }
            onClose();
            item.onClick();
          }}
        />
      </div>

      {open_submenu_item?.submenu && (
        <MenuFlyout
          anchor_el={item_refs.current[open_submenu_item.key] ?? null}
          is_open
          onClose={() => setOpenSubmenuKey(null)}
          side="left"
          width={200}
        >
          <div className="p-1.5">
            <MenuItemList
              items={open_submenu_item.submenu}
              onSelect={(item) => {
                setOpenSubmenuKey(null);
                onClose();
                item.onClick();
              }}
            />
          </div>
        </MenuFlyout>
      )}
    </BoardPopover>
  );
};

export default AnchoredMenu;
