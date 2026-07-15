"use client";
import React from "react";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

export type NavMenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Renders the row in the destructive/brand accent style (e.g. Delete). */
  danger?: boolean;
};

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

  const base_item_class =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text hover:bg-shell-hover-strong w-full";
  const danger_item_class =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-brand-200 hover:bg-brand-500/[0.14]";

  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        className="fixed z-[1000] w-[214px] rounded-xl border border-shell-border bg-shell-panel p-1.5 shadow-2xl"
        style={{ left: x, top: y }}
      >
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
                onItemClick={() => {
                  onClose();
                  item.onClick();
                }}
                className={item.danger ? danger_item_class : base_item_class}
              >
                <span
                  className={`flex w-4 flex-none ${item.danger ? "text-brand-200" : "text-shell-text-muted"}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </DropdownItem>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

export default NavRowMenu;
