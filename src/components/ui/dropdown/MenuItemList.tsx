"use client";
import React from "react";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import "./action-menu.css";

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
  /**
   * Forces (true) or suppresses (false) a divider above this row. When left
   * out, a divider is only added before the first `danger` row.
   */
  divider_before?: boolean;
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
 * Rows use the same monday.com look as {@link ActionMenu} (`action-menu.css`),
 * so the caller must render it inside an `.action-menu` card. Positioning is
 * intentionally left to the caller, {@link AnchoredMenu} wraps this for
 * anchor-el popovers.
 */
export const MenuItemList: React.FC<MenuItemListProps> = ({ title, items, onSelect, getItemRef }) => {
  return (
    <>
      {title && (
        <div className="action-menu__title truncate" aria-hidden="true">
          {title}
        </div>
      )}
      {items.map((item, index) => {
        const previous = items[index - 1];
        const needs_divider = Boolean(previous) && (item.divider_before ?? (item.danger && !previous?.danger));
        return (
          <React.Fragment key={item.key}>
            {needs_divider && <div className="action-menu__divider" role="separator" />}
            <DropdownItem
              tag="button"
              baseClassName="action-menu__item"
              buttonRef={getItemRef?.(item.key)}
              onItemClick={() => onSelect(item)}
              disabled={item.disabled}
              danger={item.danger}
            >
              <span className="action-menu__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="action-menu__label">{item.label}</span>
              {item.trailing && <span className="action-menu__chevron">{item.trailing}</span>}
            </DropdownItem>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default MenuItemList;
