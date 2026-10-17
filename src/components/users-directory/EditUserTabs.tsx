"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { KeyIcon, PersonIcon, ShieldIcon } from "@/icons/workspace-icons";

/** Sections of {@link EditUserView}, switched via {@link EditUserTabs} and mirrored in the URL as `?tab=`. */
export type EditUserTabId = "profile" | "password" | "access";

export const EDIT_USER_TAB_IDS: EditUserTabId[] = ["profile", "password", "access"];

export const DEFAULT_EDIT_USER_TAB: EditUserTabId = "profile";

export type EditUserTabsProps = {
  active_tab: EditUserTabId;
  onSelect: (id: EditUserTabId) => void;
};

const TAB_ITEMS: { id: EditUserTabId; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", hint: "Name, email, phone and department", icon: <PersonIcon size={15} /> },
  { id: "password", label: "Password", hint: "Set a new password or email a reset link", icon: <KeyIcon size={15} /> },
  { id: "access", label: "Account access", hint: "Disable, enable, delete or restore the account", icon: <ShieldIcon size={15} /> },
];

/**
 * monday style text tabs with an underline for {@link EditUserView}: Profile, Password and
 * Account access. Arrow keys move between tabs, like a native tab list.
 */
const EditUserTabs: React.FC<EditUserTabsProps> = ({ active_tab, onSelect }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = EDIT_USER_TAB_IDS.indexOf(active_tab);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = EDIT_USER_TAB_IDS[(index + step + EDIT_USER_TAB_IDS.length) % EDIT_USER_TAB_IDS.length];
    onSelect(next);
    window.requestAnimationFrame(() => document.getElementById(`edit-user-tab-${next}`)?.focus());
  };

  return (
    <div role="tablist" aria-label="Edit user sections" className="ud-tabs" onKeyDown={handleKeyDown}>
      {TAB_ITEMS.map((item) => {
        const is_active = active_tab === item.id;
        return (
          <PortalTooltip key={item.id} content={item.hint} placement="bottom">
            <button
              id={`edit-user-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={is_active}
              aria-controls="edit-user-panel"
              tabIndex={is_active ? 0 : -1}
              onClick={() => onSelect(item.id)}
              className="ud-tab"
            >
              {item.icon}
              {item.label}
            </button>
          </PortalTooltip>
        );
      })}
    </div>
  );
};

export default EditUserTabs;
