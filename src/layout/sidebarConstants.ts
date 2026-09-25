import type { SidebarPreferences, SidebarSectionKey } from "@/types/auth";

/** Shared clamp for the workspace sidebar's `width`, dragged via `SidebarResizeHandle`. */
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 480;

/** Starting width for a viewer who has never dragged the resize handle, matching the previous fixed `w-80`. */
export const DEFAULT_SIDEBAR_WIDTH = 320;

/**
 * Per-viewer local cache of the sidebar width, read synchronously on mount so
 * it paints at the right size before `SidebarProvider` can hear back from
 * `useAuth()`'s profile fetch (the durable, per-user source of truth, see
 * `SidebarContext`'s own doc comment).
 */
export const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar_width";

export const clampSidebarWidth = (width: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));

/** Labels of the sidebar's personal sections, in their default order (mirrors `SidebarPreferences::SECTION_KEYS` on the API). */
export const SIDEBAR_SECTION_LABELS: Record<SidebarSectionKey, string> = {
  home: "Home",
  my_work: "My work",
  favorites: "Favorites",
  recent: "Recent",
};

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferences = {
  sections: (Object.keys(SIDEBAR_SECTION_LABELS) as SidebarSectionKey[]).map((key) => ({ key, is_visible: true })),
  collapsed_sections: [],
};

/** `collapsed_sections` key of one Favorites workspace group. */
export const favoritesWorkspaceSectionKey = (workspace_id: number | null): string =>
  `favorites_workspace:${workspace_id ?? 0}`;
