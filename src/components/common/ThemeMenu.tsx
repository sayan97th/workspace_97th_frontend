"use client";

import React, { useEffect, useState } from "react";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";

const iconBaseProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.3,
};

const LightGlyph = () => (
  <svg {...iconBaseProps}>
    <circle cx="8" cy="8" r="3" />
    <path
      d="M8 1.6 v1.8 M8 12.6 v1.8 M1.6 8 h1.8 M12.6 8 h1.8 M3.5 3.5 l1.3 1.3 M11.2 11.2 l1.3 1.3 M12.5 3.5 l-1.3 1.3 M4.8 11.2 l-1.3 1.3"
      strokeLinecap="round"
    />
  </svg>
);

const DarkGlyph = () => (
  <svg {...iconBaseProps}>
    <path d="M9.8 2.2 a5.8 5.8 0 1 0 4 8.4 A4.6 4.6 0 0 1 9.8 2.2Z" strokeLinejoin="round" />
  </svg>
);

const SystemGlyph = () => (
  <svg {...iconBaseProps}>
    <rect x="2" y="3" width="12" height="8" rx="1" />
    <path d="M6 13.5 h4 M8 11 v2.5" strokeLinecap="round" />
  </svg>
);

const ChevronGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M4.5 3 L7.5 6 L4.5 9"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: "light", label: "Light", icon: <LightGlyph /> },
  { mode: "dark", label: "Dark", icon: <DarkGlyph /> },
  { mode: "system", label: "System default", icon: <SystemGlyph /> },
];

export type ThemeMenuProps = {
  /** Icon + label shown for the trigger row itself (defaults match the account menu row). */
  trigger_icon?: React.ReactNode;
  trigger_label?: string;
  /** Overrides the trigger row's className; falls back to the account-menu row style. */
  rowClassName?: string;
};

const default_row_class =
  "flex w-full items-center gap-[11px] rounded-lg px-2 py-2 text-left text-[13.5px] font-medium text-shell-text transition-colors hover:bg-shell-hover";

/**
 * "Change theme" row + flyout submenu (Light / Dark / System default), reusable
 * anywhere a theme switcher is needed. Matches the "97 Workspace Menu" design's
 * theme submenu, minus the mockup's decorative "Night" option — see
 * `ThemeContext` for why only three real modes are supported.
 */
const ThemeMenu: React.FC<ThemeMenuProps> = ({
  trigger_icon = <DarkGlyph />,
  trigger_label = "Change theme",
  rowClassName,
}) => {
  const { theme_mode, setThemeMode } = useTheme();
  const [is_submenu_open, setIsSubmenuOpen] = useState(false);

  // Guard against the parent account panel's own Escape listener closing both
  // layers on one keypress — same fix as BoardPopover's Escape handler.
  useEffect(() => {
    if (!is_submenu_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsSubmenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_submenu_open]);

  const toggleSubmenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsSubmenuOpen((previous) => !previous);
  };

  const closeSubmenu = () => setIsSubmenuOpen(false);

  const handleSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    closeSubmenu();
  };

  const active_option =
    THEME_OPTIONS.find((option) => option.mode === theme_mode) ?? THEME_OPTIONS[1];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleSubmenu}
        aria-haspopup="menu"
        aria-expanded={is_submenu_open}
        className={rowClassName ?? default_row_class}
      >
        <span className="flex w-4 flex-none justify-center text-shell-text-muted">
          {trigger_icon}
        </span>
        {trigger_label}
        <span className="ml-auto flex items-center gap-2 text-[12px] text-shell-text-muted">
          {active_option.label}
          <ChevronGlyph />
        </span>
      </button>

      {is_submenu_open && (
        <>
          <div className="fixed inset-0 z-[210]" onClick={closeSubmenu} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Theme options"
            className="absolute right-0 bottom-full z-[211] mb-1.5 w-[196px] rounded-xl border border-shell-border bg-shell-panel p-1.5 shadow-2xl"
          >
            {THEME_OPTIONS.map((option) => {
              const is_active = option.mode === theme_mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={is_active}
                  onClick={() => handleSelect(option.mode)}
                  className={`flex w-full items-center gap-[11px] rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    is_active
                      ? "bg-brand-500 text-white"
                      : "text-shell-text hover:bg-shell-hover"
                  }`}
                >
                  <span className="flex w-4 flex-none justify-center">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeMenu;
