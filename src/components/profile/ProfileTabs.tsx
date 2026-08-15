"use client";
import React from "react";
import type { ProfileSectionId } from "./types";

export type ProfileTabsProps = {
  active_section: ProfileSectionId;
  onSelect: (id: ProfileSectionId) => void;
};

const iconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.3,
};

const PersonalInfoIcon = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="5.5" r="2.6" />
    <path d="M3 13 c0-2.8 2.2-4.3 5-4.3 s5 1.5 5 4.3" strokeLinecap="round" />
  </svg>
);
const WorkingStatusIcon = () => (
  <svg {...iconProps}>
    <rect x="2.5" y="4.2" width="11" height="8.6" rx="1.4" />
    <path d="M5.6 4.2 V2.6 A1.4 1.4 0 0 1 7 1.2 H9 A1.4 1.4 0 0 1 10.4 2.6 V4.2" />
  </svg>
);
const NotificationsIcon = () => (
  <svg {...iconProps}>
    <path d="M8 2 C5.8 2 4.3 3.6 4.3 5.8 V8.5 L3 11 H13 L11.7 8.5 V5.8 C11.7 3.6 10.2 2 8 2Z" strokeLinejoin="round" />
    <path d="M6.5 12.5 a1.6 1.6 0 0 0 3 0" />
  </svg>
);
const LanguageRegionIcon = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2 8 H14 M8 2 C9.8 4 9.8 12 8 14 M8 2 C6.2 4 6.2 12 8 14" strokeWidth={1.1} />
  </svg>
);
const PasswordIcon = () => (
  <svg {...iconProps}>
    <rect x="3.5" y="7.2" width="9" height="6.6" rx="1.3" />
    <path d="M5.3 7.2 V5 A2.7 2.7 0 0 1 10.7 5 V7.2" />
  </svg>
);
const SessionHistoryIcon = () => (
  <svg {...iconProps}>
    <line x1="3" y1="4" x2="13" y2="4" strokeLinecap="round" />
    <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
    <line x1="3" y1="12" x2="13" y2="12" strokeLinecap="round" />
  </svg>
);

const TAB_ITEMS: { id: ProfileSectionId; label: string; icon: React.ReactNode }[] = [
  { id: "personal", label: "Personal info", icon: <PersonalInfoIcon /> },
  { id: "working", label: "Working status", icon: <WorkingStatusIcon /> },
  { id: "notifications", label: "Notifications", icon: <NotificationsIcon /> },
  { id: "language", label: "Language & region", icon: <LanguageRegionIcon /> },
  { id: "password", label: "Password", icon: <PasswordIcon /> },
  { id: "sessions", label: "Session history", icon: <SessionHistoryIcon /> },
];

/**
 * Horizontal top tab bar for {@link ProfileView} — the page equivalent of the old
 * `ProfileModal`'s left nav: one tab per profile section, switched without a route change.
 * Styled after {@link BoardViewTabs}'s active-tab underline so the profile page reads
 * consistently with the board views tab row elsewhere in the app.
 */
const ProfileTabs: React.FC<ProfileTabsProps> = ({ active_section, onSelect }) => (
  <div role="tablist" aria-label="Profile sections" className="scrollnice flex items-center gap-1 overflow-x-auto border-b border-shell-border">
    {TAB_ITEMS.map((item) => {
      const is_active = active_section === item.id;
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

export default ProfileTabs;
