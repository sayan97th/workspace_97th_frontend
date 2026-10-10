"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import "./action-menu.css";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Fired on select. Rows with a `submenu` open it instead. */
  onClick?: () => void;
  /** Keeps the row visible but faded and inert, the way monday.com shows actions the viewer can't take. */
  disabled?: boolean;
  /** Tooltip explaining why a disabled row can't be used. */
  disabled_reason?: string;
  /** Destructive styling (red text and icon) for an enabled row. */
  danger?: boolean;
  /** Nested rows opened in a side flyout, on hover, click or ArrowRight. */
  submenu?: ActionMenuItem[];
};

/** One group of rows. Groups are split by a thin divider, the way monday.com groups its menus. */
export type ActionMenuSection = {
  key: string;
  items: ActionMenuItem[];
};

export type ActionMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  sections: ActionMenuSection[];
  /** Accessible name of the menu, e.g. "Workspace options". */
  aria_label: string;
  width?: number;
  submenu_width?: number;
  align?: "start" | "end";
};

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/** Moves focus between the enabled rows of one menu list with the arrow, Home and End keys. */
const moveFocus = (list_el: HTMLElement, key: string): boolean => {
  const rows = [...list_el.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)];
  if (rows.length === 0) return false;
  const current_index = rows.indexOf(document.activeElement as HTMLElement);
  const next_index =
    key === "Home"
      ? 0
      : key === "End"
        ? rows.length - 1
        : key === "ArrowDown"
          ? (current_index + 1) % rows.length
          : current_index <= 0
            ? rows.length - 1
            : current_index - 1;
  rows[next_index].focus();
  return true;
};

type ActionMenuListProps = {
  sections: ActionMenuSection[];
  aria_label: string;
  /** What takes focus on mount: the list itself (so arrow keys work), its first enabled row, or nothing (submenus opened on hover). */
  initial_focus?: "list" | "first_item" | "none";
  open_submenu_key?: string | null;
  onOpenSubmenu?: (item: ActionMenuItem, focus_first: boolean) => void;
  onCloseSubmenu?: () => void;
  /** ArrowLeft inside a submenu hands focus back to the row that opened it. */
  onExitLeft?: () => void;
  onSelect: (item: ActionMenuItem) => void;
  getItemRef?: (key: string) => (el: HTMLButtonElement | null) => void;
};

const ActionMenuList: React.FC<ActionMenuListProps> = ({
  sections,
  aria_label,
  initial_focus = "list",
  open_submenu_key = null,
  onOpenSubmenu,
  onCloseSubmenu,
  onExitLeft,
  onSelect,
  getItemRef,
}) => {
  const list_ref = useRef<HTMLDivElement>(null);
  const visible_sections = sections.filter((section) => section.items.length > 0);

  useEffect(() => {
    const list_el = list_ref.current;
    if (!list_el || initial_focus === "none") return;
    // The popover renders hidden on its first frame while it measures itself, and hidden elements can't take focus.
    const frame = requestAnimationFrame(() => {
      if (initial_focus === "first_item") list_el.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
      else list_el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [initial_focus]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      if (list_ref.current && moveFocus(list_ref.current, event.key)) event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft" && onExitLeft) {
      event.preventDefault();
      onExitLeft();
    }
  };

  const renderItem = (item: ActionMenuItem) => {
    const has_submenu = Boolean(item.submenu?.length);
    const is_submenu_open = has_submenu && open_submenu_key === item.key;

    return (
      <button
        key={item.key}
        ref={getItemRef?.(item.key)}
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        aria-haspopup={has_submenu ? "menu" : undefined}
        aria-expanded={has_submenu ? is_submenu_open : undefined}
        data-danger={item.danger || undefined}
        data-submenu-open={is_submenu_open || undefined}
        title={item.disabled ? item.disabled_reason : undefined}
        className="action-menu__item"
        onMouseEnter={() => {
          if (has_submenu && !item.disabled) onOpenSubmenu?.(item, false);
          else onCloseSubmenu?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && has_submenu && !item.disabled) {
            event.preventDefault();
            event.stopPropagation();
            onOpenSubmenu?.(item, true);
          }
        }}
        onClick={() => {
          if (item.disabled) return;
          if (has_submenu) {
            onOpenSubmenu?.(item, false);
            return;
          }
          onSelect(item);
        }}
      >
        {item.icon && (
          <span className="action-menu__icon" aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className="action-menu__label">{item.label}</span>
        {has_submenu && (
          <span className="action-menu__chevron" aria-hidden="true">
            <ChevronRightIcon size={14} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      ref={list_ref}
      role="menu"
      aria-label={aria_label}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`action-menu ${boardTreeFontClassName}`}
    >
      {visible_sections.map((section, index) => (
        <React.Fragment key={section.key}>
          {index > 0 && <div className="action-menu__divider" role="separator" />}
          {section.items.map(renderItem)}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * monday.com style options menu anchored to a trigger button: grouped rows
 * split by dividers, disabled rows kept visible with a reason tooltip, and
 * submenus that open to the side on hover, click or ArrowRight. Positioning,
 * outside click and Escape come from {@link BoardPopover} and
 * {@link MenuFlyout}, the look from `action-menu.css`.
 */
const ActionMenu: React.FC<ActionMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  sections,
  aria_label,
  width = 256,
  submenu_width = 220,
  align = "start",
}) => {
  const [open_submenu, setOpenSubmenu] = useState<{ key: string; focus_first: boolean } | null>(null);
  const item_refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!is_open) setOpenSubmenu(null);
  }, [is_open]);

  const open_submenu_item = open_submenu
    ? sections.flatMap((section) => section.items).find((item) => item.key === open_submenu.key)
    : undefined;

  const selectItem = (item: ActionMenuItem) => {
    setOpenSubmenu(null);
    onClose();
    item.onClick?.();
  };

  const closeSubmenu = () => setOpenSubmenu(null);

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align} unstyled>
      <ActionMenuList
        sections={sections}
        aria_label={aria_label}
        open_submenu_key={open_submenu?.key ?? null}
        onOpenSubmenu={(item, focus_first) => setOpenSubmenu({ key: item.key, focus_first })}
        onCloseSubmenu={closeSubmenu}
        onSelect={selectItem}
        getItemRef={(key) => (el) => {
          item_refs.current[key] = el;
        }}
      />

      {open_submenu_item?.submenu && (
        <MenuFlyout
          anchor_el={item_refs.current[open_submenu_item.key] ?? null}
          is_open
          onClose={closeSubmenu}
          side="right"
          width={submenu_width}
          unstyled
        >
          <ActionMenuList
            key={open_submenu_item.key}
            sections={[{ key: open_submenu_item.key, items: open_submenu_item.submenu }]}
            aria_label={open_submenu_item.label}
            initial_focus={open_submenu?.focus_first ? "first_item" : "none"}
            onSelect={selectItem}
            onExitLeft={() => {
              const parent_row = item_refs.current[open_submenu_item.key];
              closeSubmenu();
              parent_row?.focus();
            }}
          />
        </MenuFlyout>
      )}
    </BoardPopover>
  );
};

export default ActionMenu;
