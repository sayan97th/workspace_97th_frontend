"use client";
import React from "react";
import { PROFILE_NAV_ITEMS } from "./profileNavConfig";
import type { ProfileSectionId } from "./types";

export type ProfileTabsProps = {
  active_section: ProfileSectionId;
  onSelect: (id: ProfileSectionId) => void;
};

/**
 * Left rail of {@link ProfileView}, styled after the Administration rail: one row per section
 * with its icon, the active row in monday's selected blue. Under 900px wide it turns into a
 * horizontally scrolling strip above the card. Arrow keys move between sections, like any tablist.
 */
const ProfileTabs: React.FC<ProfileTabsProps> = ({ active_section, onSelect }) => {
  const selectByOffset = (offset: number) => {
    const index = PROFILE_NAV_ITEMS.findIndex((item) => item.id === active_section);
    const next = PROFILE_NAV_ITEMS[(index + offset + PROFILE_NAV_ITEMS.length) % PROFILE_NAV_ITEMS.length];
    onSelect(next.id);
    document.getElementById(`profile-tab-${next.id}`)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectByOffset(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectByOffset(-1);
    }
  };

  return (
    <nav role="tablist" aria-label="Profile sections" aria-orientation="vertical" className="profile-rail" onKeyDown={handleKeyDown}>
      {PROFILE_NAV_ITEMS.map((item) => {
        const is_active = active_section === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            id={`profile-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={is_active}
            aria-controls="profile-section-panel"
            tabIndex={is_active ? 0 : -1}
            onClick={() => onSelect(item.id)}
            className="profile-rail-row"
          >
            <span className="profile-rail-icon">
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};

export default ProfileTabs;
