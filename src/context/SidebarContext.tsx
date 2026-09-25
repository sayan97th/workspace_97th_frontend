"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { profilePreferencesService } from "@/services/profile-preferences.service";
import {
  DEFAULT_SIDEBAR_PREFERENCES,
  DEFAULT_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
  clampSidebarWidth,
} from "@/layout/sidebarConstants";
import type { SidebarPreferences, SidebarSectionPreference } from "@/types/auth";

type SidebarContextType = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  active_item_id: string;
  active_item_label: string;
  /** Current sidebar width in pixels, dragged via `SidebarResizeHandle`, see this file's own doc comment for how it's persisted. */
  sidebar_width: number;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (id: string, label: string) => void;
  /** Local-only width preview fired on every pointer move of a resize drag, see `SidebarResizeHandle`. */
  previewSidebarWidth: (width: number) => void;
  /** Fired once on the resize drag's end, persists the final width for the current user (see doc comment below). */
  commitSidebarWidth: (width: number) => void;
  /** Order, visibility and collapse state of the personal sections (Home, My work, Favorites, Recent). */
  sidebar_preferences: SidebarPreferences;
  /** Saves a new order and visibility of the personal sections ("Customize sidebar"). */
  updateSidebarSections: (sections: SidebarSectionPreference[]) => void;
  isSectionCollapsed: (section_key: string) => boolean;
  /** Folds or unfolds a personal section (or a Favorites workspace group) and saves it on the account. */
  toggleSectionCollapsed: (section_key: string) => void;
  /** True while the collapsed sidebar is shown as a temporary overlay because the pointer is over its rail. */
  is_peeking: boolean;
  setIsPeeking: (is_peeking: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

/**
 * The workspace sidebar's width is a personal preference (see `AppSidebar`'s
 * `SidebarResizeHandle`): each user drags it to whatever size suits them, and
 * that choice should survive a reload without affecting anyone else's. It's
 * persisted server-side on the authenticated user (`users.sidebar_width`,
 * see `SidebarPreferenceController` on the backend) so it follows the user
 * across devices, and mirrored into `localStorage` purely so a reload paints
 * at the right width immediately instead of flashing the default while the
 * profile is still loading.
 */
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [active_item, setActiveItemState] = useState({
    id: "home",
    label: "Workspace home",
  });
  const [sidebar_width, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
    const stored_width = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return Number.isFinite(stored_width) && stored_width > 0 ? clampSidebarWidth(stored_width) : DEFAULT_SIDEBAR_WIDTH;
  });
  // Applies the server-persisted width once per signed-in user, so it wins over
  // whatever was cached locally without fighting a drag already in progress.
  const hydrated_user_id_ref = useRef<number | null>(null);
  const [sidebar_preferences, setSidebarPreferences] = useState<SidebarPreferences>(DEFAULT_SIDEBAR_PREFERENCES);
  const [is_peeking, setIsPeeking] = useState(false);

  useEffect(() => {
    if (!user || hydrated_user_id_ref.current === user.id) return;
    hydrated_user_id_ref.current = user.id;
    if (user.sidebar_width != null) {
      setSidebarWidth(clampSidebarWidth(user.sidebar_width));
    }
    if (user.sidebar_preferences) {
      setSidebarPreferences(user.sidebar_preferences);
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsPeeking(false);
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const setActiveItem = (id: string, label: string) => {
    setActiveItemState({ id, label });
  };

  const previewSidebarWidth = useCallback((width: number) => {
    setSidebarWidth(clampSidebarWidth(width));
  }, []);

  const commitSidebarWidth = useCallback((width: number) => {
    const clamped_width = clampSidebarWidth(width);
    setSidebarWidth(clamped_width);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped_width));
    } catch {
      // Private browsing / disabled storage, the server-persisted value below still applies next login.
    }
    profilePreferencesService.updateSidebarPreference({ width: clamped_width }).catch(() => {
      // Best-effort, the drag already landed locally, a failed save just means it
      // won't survive a reload, no different from any other lost profile PATCH.
    });
  }, []);

  const updateSidebarSections = useCallback((sections: SidebarSectionPreference[]) => {
    setSidebarPreferences((current) => ({ ...current, sections }));
    profilePreferencesService.updateSidebarPreference({ sections }).catch(() => {
      // Best-effort like the width: the layout already changed locally.
    });
  }, []);

  const isSectionCollapsed = useCallback(
    (section_key: string) => sidebar_preferences.collapsed_sections.includes(section_key),
    [sidebar_preferences.collapsed_sections]
  );

  const toggleSectionCollapsed = useCallback((section_key: string) => {
    setSidebarPreferences((current) => {
      const collapsed_sections = current.collapsed_sections.includes(section_key)
        ? current.collapsed_sections.filter((key) => key !== section_key)
        : [...current.collapsed_sections, section_key];
      profilePreferencesService.updateSidebarPreference({ collapsed_sections }).catch(() => {
        // Best-effort, the section is already folded locally.
      });
      return { ...current, collapsed_sections };
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        active_item_id: active_item.id,
        active_item_label: active_item.label,
        sidebar_width,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
        setActiveItem,
        previewSidebarWidth,
        commitSidebarWidth,
        sidebar_preferences,
        updateSidebarSections,
        isSectionCollapsed,
        toggleSectionCollapsed,
        is_peeking,
        setIsPeeking,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
