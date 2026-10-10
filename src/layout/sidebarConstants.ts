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

/** Labels of the app rail's sections, in their default order (mirrors `SidebarPreferences::SECTION_KEYS` on the API). */
export const SIDEBAR_SECTION_LABELS: Record<SidebarSectionKey, string> = {
  home: "Home",
  my_work: "My work",
  favorites: "Favorites",
  automations: "Automations",
  recent: "Recent",
};

/** Sections that start out in the rail's "More" menu instead of the rail itself (mirrors `SidebarPreferences::DEFAULT_HIDDEN_SECTION_KEYS`). */
export const DEFAULT_HIDDEN_SIDEBAR_SECTIONS: SidebarSectionKey[] = ["recent"];

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferences = {
  sections: (Object.keys(SIDEBAR_SECTION_LABELS) as SidebarSectionKey[]).map((key) => ({
    key,
    is_visible: !DEFAULT_HIDDEN_SIDEBAR_SECTIONS.includes(key),
  })),
  collapsed_sections: [],
};

/** What the second level panel next to the rail lists: the workspace tree, or a personal list opened from the rail. */
export type SidebarPanelView = "workspace" | "favorites" | "recent";

/** Width of the always visible app rail, matching monday.com's 72px rail. */
export const SIDEBAR_RAIL_WIDTH = 72;

/** `collapsed_sections` key of one Favorites workspace group. */
export const favoritesWorkspaceSectionKey = (workspace_id: number | null): string =>
  `favorites_workspace:${workspace_id ?? 0}`;

/** One 36px row of the sidebar panel (tree rows, favorites, recent), monday.com spacing and type. */
export const SIDEBAR_ROW_CLASS =
  "group relative flex h-9 items-center gap-[11px] rounded-md px-2 text-sm text-sidebar-text outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-focus";

export const SIDEBAR_ROW_ACTIVE_CLASS = "bg-sidebar-active hover:bg-sidebar-active";

/** Square icon button of the panel header and rail (options, search, collapse). */
export const SIDEBAR_ICON_BUTTON_CLASS =
  "flex h-8 w-8 flex-none items-center justify-center rounded-md text-sidebar-text-secondary transition-colors hover:bg-sidebar-hover hover:text-sidebar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-focus disabled:opacity-50";

export const isPathActive = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);
