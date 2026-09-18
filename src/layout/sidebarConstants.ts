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
