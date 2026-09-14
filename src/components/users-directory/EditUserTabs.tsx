"use client";
import React from "react";
import { KeyIcon, PersonIcon } from "@/icons/workspace-icons";

/** Sections of {@link EditUserView}, switched via {@link EditUserTabs} and mirrored in the URL as `?tab=`. */
export type EditUserTabId = "profile" | "password";

export const EDIT_USER_TAB_IDS: EditUserTabId[] = ["profile", "password"];

export const DEFAULT_EDIT_USER_TAB: EditUserTabId = "profile";

export type EditUserTabsProps = {
  active_tab: EditUserTabId;
  onSelect: (id: EditUserTabId) => void;
};

const TAB_ITEMS: { id: EditUserTabId; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <PersonIcon size={15} /> },
  { id: "password", label: "Change password", icon: <KeyIcon size={15} /> },
];

/**
 * Top tab bar for {@link EditUserView}, splitting the account's editable fields ("Profile")
 * from its password actions ("Change password"). Styled after {@link ProfileTabs}'s
 * active-tab underline so this page reads consistently with "My Profile"'s own tab row.
 */
const EditUserTabs: React.FC<EditUserTabsProps> = ({ active_tab, onSelect }) => (
  <div
    role="tablist"
    aria-label="Edit user sections"
    className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-shell-border"
  >
    {TAB_ITEMS.map((item) => {
      const is_active = active_tab === item.id;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={is_active}
          onClick={() => onSelect(item.id)}
          className={`-mb-px flex flex-none items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-[13.5px] transition-colors ${
            is_active
              ? "border-brand-500 font-bold text-shell-text"
              : "border-transparent font-medium text-shell-text-muted hover:text-shell-text"
          }`}
        >
          <span className={`flex flex-none ${is_active ? "text-brand-500" : "text-shell-text-faint"}`}>{item.icon}</span>
          {item.label}
        </button>
      );
    })}
  </div>
);

export default EditUserTabs;
