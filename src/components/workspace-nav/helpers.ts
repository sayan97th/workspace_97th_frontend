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
 * The href a leaf navigates to: an explicit `href` (used by special static
 * pages like Workspace Home) takes precedence, otherwise the id-routed board
 * path — which is what every generic, database-backed board (including
 * Client Hub) resolves to.
 */
export const getLeafHref = (node: WorkspaceNavNode): string =>
  node.href ?? buildBoardPath(node.id);

/** Where a node sits in the tree: its parent id, its sibling list, and its index within it. */
export type NavNodeLocation = {
  node: WorkspaceNavNode;
  siblings: WorkspaceNavNode[];
  index: number;
  parent_id: number | null;
};

/** Recursively find a node by id, along with its sibling list and position — used for reordering (drag-and-drop, "Move up"/"Move down"). */
export const locateNavNode = (tree: WorkspaceNavNode[], node_id: number): NavNodeLocation | null => {
  const search = (nodes: WorkspaceNavNode[], parent_id: number | null): NavNodeLocation | null => {
    const index = nodes.findIndex((node) => node.id === node_id);
    if (index !== -1) return { node: nodes[index], siblings: nodes, index, parent_id };

    for (const node of nodes) {
      if (node.type === "group") {
        const found = search(node.children, node.id);
        if (found) return found;
      }
    }
    return null;
  };
  return search(tree, null);
};

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
  is_priority: workspace.is_priority,
  product: workspace.product,
  privacy: workspace.privacy,
  role: workspace.role ?? undefined,
  memberships: workspace.memberships as WorkspaceMembership[],
});
