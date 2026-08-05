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
  /** Nested rows opened in a side flyout instead of firing `onClick` directly — see {@link AnchoredMenu}. */
  submenu?: MenuListItem[];
  /** Greys the row out and blocks `onClick` instead of hiding it — e.g. "Move ahead" when the row is already last. */
  disabled?: boolean;
};

export type MenuItemListProps = {
  title?: string;
  items: MenuListItem[];
  onSelect: (item: MenuListItem) => void;
  /** Captures a specific row's DOM node by key — e.g. to anchor a submenu flyout off it. */
  getItemRef?: (key: string) => (el: HTMLButtonElement | null) => void;
};

/**
 * Shared row-list renderer for kebab/options menus: a title, a stack of icon +
 * label rows, and an auto-inserted divider before the first `danger` row.
 * Positioning is intentionally left to the caller — {@link AnchoredMenu} wraps
 * this for anchor-el popovers.
 */
export const MenuItemList: React.FC<MenuItemListProps> = ({ title, items, onSelect, getItemRef }) => {
  const base_item_class =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text hover:bg-shell-hover-strong w-full";
  const danger_item_class =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-brand-200 hover:bg-brand-500/[0.14]";
  const disabled_item_class =
    "flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text-faint";

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
        const item_class = item.disabled ? disabled_item_class : item.danger ? danger_item_class : base_item_class;
        return (
          <React.Fragment key={item.key}>
            {needs_divider && <div className="my-1 h-px bg-shell-border" />}
            <DropdownItem
              tag="button"
              baseClassName=""
              buttonRef={getItemRef?.(item.key)}
              onItemClick={() => onSelect(item)}
              disabled={item.disabled}
              className={item_class}
            >
              <span
                className={`flex w-4 flex-none ${item.disabled ? "text-shell-text-faint" : item.danger ? "text-brand-200" : "text-shell-text-muted"}`}
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
