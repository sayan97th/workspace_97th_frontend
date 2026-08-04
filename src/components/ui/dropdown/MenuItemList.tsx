"use client";
import React from "react";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

export type MenuListItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Renders the row in the destructive/brand accent style (e.g. Delete). */
  danger?: boolean;
  /** Extra content pinned to the row's trailing edge (e.g. a submenu chevron). */
  trailing?: React.ReactNode;
};

export type MenuItemListProps = {
  title?: string;
  items: MenuListItem[];
  onSelect: (item: MenuListItem) => void;
};

/**
 * Shared row-list renderer for kebab/options menus: a title, a stack of icon +
 * label rows, and an auto-inserted divider before the first `danger` row.
 * Positioning is intentionally left to the caller — {@link AnchoredMenu} wraps
 * this for anchor-el popovers.
 */
export const MenuItemList: React.FC<MenuItemListProps> = ({ title, items, onSelect }) => {
  const base_item_class =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text hover:bg-shell-hover-strong w-full";
  const danger_item_class =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-brand-200 hover:bg-brand-500/[0.14]";

  return (
    <>
      {title && (
        <div className="mb-1 truncate border-b border-shell-border px-2.5 pb-2 pt-1.5 font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">
          {title}
        </div>
      )}
      {items.map((item, index) => {
        const previous = items[index - 1];
        const needs_divider = item.danger && previous && !previous.danger;
        return (
          <React.Fragment key={item.key}>
            {needs_divider && <div className="my-1 h-px bg-shell-border" />}
            <DropdownItem
              tag="button"
              baseClassName=""
              onItemClick={() => onSelect(item)}
              className={item.danger ? danger_item_class : base_item_class}
            >
              <span
                className={`flex w-4 flex-none ${item.danger ? "text-brand-200" : "text-shell-text-muted"}`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.trailing}
            </DropdownItem>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default MenuItemList;
