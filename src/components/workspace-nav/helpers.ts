import type { Workspace, WorkspaceNavNode } from "@/types/workspace";
import type { BrowseWorkspace, WorkspaceMembership } from "@/data/workspace-browse-data";

/** Base segment for id-routed boards. */
export const BOARD_ROUTE_BASE = "/boards";

/**
 * Build the id-route URL for a leaf, e.g. buildBoardPath(1698256655)
 *   -> "/boards/1698256655"
 */
export const buildBoardPath = (item_id: number): string => `${BOARD_ROUTE_BASE}/${item_id}`;

/**
 * The href a leaf navigates to: an explicit `href` (used by the real Client Hub /
 * Workspace Home pages) takes precedence, otherwise the id-routed board path.
 */
export const getLeafHref = (node: WorkspaceNavNode): string =>
  node.href ?? buildBoardPath(node.id);

/** Collect the ids of every group (folder) node so they can start expanded. */
export const collectGroupIds = (nodes: WorkspaceNavNode[]): string[] => {
  const ids: string[] = [];
  const walk = (list: WorkspaceNavNode[]) => {
    for (const node of list) {
      if (node.type === "group") {
        ids.push(String(node.id));
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
};

/** Map an API workspace to the shape the switcher / browse modal already expect. */
export const mapWorkspaceToBrowse = (workspace: Workspace): BrowseWorkspace => ({
  id: workspace.slug,
  name: workspace.name,
  mono: workspace.mono,
  color: workspace.color,
  is_home: workspace.is_home,
  product: workspace.product,
  privacy: workspace.privacy,
  role: workspace.role ?? undefined,
  memberships: workspace.memberships as WorkspaceMembership[],
});
