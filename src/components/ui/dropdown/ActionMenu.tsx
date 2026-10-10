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
  /** Fired on select. Rows with a submenu open it instead, unless the row is `split`. */
  onClick?: () => void;
  /** Keeps the row visible but faded and inert, the way monday.com shows actions the viewer can't take. */
  disabled?: boolean;
  /** Tooltip explaining why a disabled row can't be used. */
  disabled_reason?: string;
  /** Destructive styling (red text and icon) for an enabled row. */
  danger?: boolean;
  /** Nested rows opened in a side flyout, on hover, click or ArrowRight. */
  submenu?: ActionMenuItem[];
  /** Like `submenu`, but split into groups by dividers. Wins over `submenu` when both are set. */
  submenu_sections?: ActionMenuSection[];
  /**
   * A row with both an action and a submenu, like monday.com's "Board" row: a
   * click on the label runs `onClick`, the chevron (behind a thin divider)
   * opens the submenu. Hover and ArrowRight open the submenu as usual.
   */
  split?: boolean;
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
  /** Optional muted heading above the first row, e.g. "Add to workspace". */
  title?: string;
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

/** The rows a submenu shows, grouped into sections. */
const getSubmenuSections = (item: ActionMenuItem): ActionMenuSection[] => {
  if (item.submenu_sections) return item.submenu_sections;
  return item.submenu?.length ? [{ key: item.key, items: item.submenu }] : [];
};

const hasSubmenu = (item: ActionMenuItem): boolean =>
  getSubmenuSections(item).some((section) => section.items.length > 0);

type ActionMenuLevelProps = {
  sections: ActionMenuSection[];
  aria_label: string;
  title?: string;
  /** What takes focus on mount: the list itself (so arrow keys work), its first enabled row, or nothing (submenus opened on hover). */
  initial_focus?: "list" | "first_item" | "none";
  submenu_width: number;
  /** ArrowLeft inside a submenu hands focus back to the row that opened it. */
  onExitLeft?: () => void;
  onSelect: (item: ActionMenuItem) => void;
};

/**
 * One menu list plus the flyout of whichever of its rows is open. Each
 * flyout renders another level, so submenus can nest ("More" > "Form").
 */
const ActionMenuLevel: React.FC<ActionMenuLevelProps> = ({
  sections,
  aria_label,
  title,
  initial_focus = "list",
  submenu_width,
  onExitLeft,
  onSelect,
}) => {
  const list_ref = useRef<HTMLDivElement>(null);
  const item_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [open_submenu, setOpenSubmenu] = useState<{ key: string; focus_first: boolean } | null>(null);
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

  const open_submenu_item = open_submenu
    ? visible_sections.flatMap((section) => section.items).find((item) => item.key === open_submenu.key)
    : undefined;

  const openSubmenu = (item: ActionMenuItem, focus_first: boolean) => {
    setOpenSubmenu((current) => (current?.key === item.key && !focus_first ? current : { key: item.key, focus_first }));
  };
  const closeSubmenu = () => setOpenSubmenu(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      if (list_ref.current && moveFocus(list_ref.current, event.key)) event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft" && onExitLeft) {
      event.preventDefault();
      event.stopPropagation();
      onExitLeft();
    }
  };

  const renderItem = (item: ActionMenuItem) => {
    const has_submenu = hasSubmenu(item);
    const is_split = has_submenu && Boolean(item.split && item.onClick);
    const is_submenu_open = has_submenu && open_submenu?.key === item.key;

    return (
      <button
        key={item.key}
        ref={(el) => {
          item_refs.current[item.key] = el;
        }}
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        aria-haspopup={has_submenu ? "menu" : undefined}
        aria-expanded={has_submenu ? is_submenu_open : undefined}
        data-danger={item.danger || undefined}
        data-submenu-open={is_submenu_open || undefined}
        data-split={is_split || undefined}
        title={item.disabled ? item.disabled_reason : undefined}
        className="action-menu__item"
        onMouseEnter={() => {
          if (has_submenu && !item.disabled) openSubmenu(item, false);
          else closeSubmenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && has_submenu && !item.disabled) {
            event.preventDefault();
            event.stopPropagation();
            openSubmenu(item, true);
          }
        }}
        onClick={(event) => {
          if (item.disabled) return;
          const is_chevron_click = (event.target as HTMLElement).closest("[data-split-toggle]") !== null;
          if (has_submenu && (!is_split || is_chevron_click)) {
            openSubmenu(item, event.detail === 0);
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
          <span className="action-menu__chevron" data-split-toggle={is_split || undefined} aria-hidden="true">
            <ChevronRightIcon size={14} />
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div
        ref={list_ref}
        role="menu"
        aria-label={aria_label}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`action-menu ${boardTreeFontClassName}`}
      >
        {title && (
          <div className="action-menu__title" aria-hidden="true">
            {title}
          </div>
        )}
        {visible_sections.map((section, index) => (
          <React.Fragment key={section.key}>
            {index > 0 && <div className="action-menu__divider" role="separator" />}
            {section.items.map(renderItem)}
          </React.Fragment>
        ))}
      </div>

      {open_submenu_item && hasSubmenu(open_submenu_item) && (
        <MenuFlyout
          anchor_el={item_refs.current[open_submenu_item.key] ?? null}
          is_open
          onClose={closeSubmenu}
          side="right"
          width={submenu_width}
          unstyled
        >
          <ActionMenuLevel
            key={open_submenu_item.key}
            sections={getSubmenuSections(open_submenu_item)}
            aria_label={open_submenu_item.label}
            initial_focus={open_submenu?.focus_first ? "first_item" : "none"}
            submenu_width={submenu_width}
            onSelect={onSelect}
            onExitLeft={() => {
              const parent_row = item_refs.current[open_submenu_item.key];
              closeSubmenu();
              parent_row?.focus();
            }}
          />
        </MenuFlyout>
      )}
    </>
  );
};

/**
 * monday.com style options menu anchored to a trigger button: an optional
 * title, grouped rows split by dividers, disabled rows kept visible with a
 * reason tooltip, split rows, and submenus (nested as deep as needed) that
 * open to the side on hover, click or ArrowRight. Positioning, outside click
 * and Escape come from {@link BoardPopover} and {@link MenuFlyout}, the look
 * from `action-menu.css`.
 */
const ActionMenu: React.FC<ActionMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  sections,
  aria_label,
  title,
  width = 256,
  submenu_width = 220,
  align = "start",
}) => {
  const selectItem = (item: ActionMenuItem) => {
    onClose();
    item.onClick?.();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={width} align={align} unstyled>
      {/* Unmounted while closed, so every submenu starts closed the next time the menu opens. */}
      <ActionMenuLevel
        sections={sections}
        aria_label={aria_label}
        title={title}
        submenu_width={submenu_width}
        onSelect={selectItem}
      />
    </BoardPopover>
  );
};

export default ActionMenu;
