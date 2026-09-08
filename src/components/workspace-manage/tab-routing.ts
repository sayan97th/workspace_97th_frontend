/**
 * Shared source of truth for Manage Workspace's tab ids and their
 * `/workspaces/{workspace_id}/{tab}` URL segments — used by both
 * `WorkspaceManage` (rendering the tab bar) and the `/workspaces/[workspace_id]`
 * route (deriving/writing the active tab from the URL), so the two never
 * drift out of sync.
 */

export type WorkspaceManageTabId = "recents" | "content" | "collaborators" | "permissions";

export const DEFAULT_WORKSPACE_MANAGE_TAB: WorkspaceManageTabId = "recents";

/** URL segment for each tab, e.g. "collaborators" -> "/workspaces/{workspace_id}/collaborators". */
export const WORKSPACE_MANAGE_TAB_SLUGS: Record<WorkspaceManageTabId, string> = {
  recents: "recent-boards",
  content: "content-management",
  collaborators: "collaborators",
  permissions: "permissions",
};

const TAB_BY_SLUG: Record<string, WorkspaceManageTabId> = Object.fromEntries(
  Object.entries(WORKSPACE_MANAGE_TAB_SLUGS).map(([tab_id, slug]) => [slug, tab_id as WorkspaceManageTabId])
);

/** Parses a `/workspaces/{workspace_id}/{tab}` URL segment back into a tab id, or null when it isn't one of the known tabs. */
export const workspaceManageTabFromSlug = (slug: string | undefined): WorkspaceManageTabId | null =>
  (slug && TAB_BY_SLUG[slug]) || null;

/**
 * Builds a Manage Workspace tab URL, e.g.
 * buildWorkspaceManagePath(5525129, "collaborators") -> "/workspaces/5525129/collaborators"
 */
export const buildWorkspaceManagePath = (
  workspace_id: number,
  tab: WorkspaceManageTabId = DEFAULT_WORKSPACE_MANAGE_TAB
): string => `/workspaces/${workspace_id}/${WORKSPACE_MANAGE_TAB_SLUGS[tab]}`;
