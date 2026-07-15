import type { Workspace, WorkspaceNavNode } from "@/types/workspace";
import type { BrowseWorkspace, WorkspaceMembership } from "@/data/workspace-browse-data";

/** Base segment for dynamically-routed workspace views. */
export const WORKSPACE_ROUTE_BASE = "/w";

/**
 * Build the dynamic-route URL for a leaf, from its slug path within a workspace.
 * e.g. buildWorkspacePath("fulfillment", ["development", "sprints"])
 *   -> "/w/fulfillment/development/sprints"
 */
export const buildWorkspacePath = (
  workspace_slug: string,
  segments: string[]
): string => {
  const suffix = segments.length > 0 ? `/${segments.join("/")}` : "";
  return `${WORKSPACE_ROUTE_BASE}/${workspace_slug}${suffix}`;
};

/**
 * The href a leaf navigates to: an explicit `href` (used by the real Client Hub /
 * Workspace Home pages) takes precedence, otherwise the dynamic workspace route.
 */
export const getLeafHref = (
  workspace_slug: string,
  node: WorkspaceNavNode,
  slug_path: string[]
): string => node.href ?? buildWorkspacePath(workspace_slug, slug_path);

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

/** Walk the tree following a path of slugs, returning the matched node or null. */
export const findNodeByPath = (
  nodes: WorkspaceNavNode[],
  slug_path: string[]
): WorkspaceNavNode | null => {
  if (slug_path.length === 0) return null;
  const [head, ...rest] = slug_path;
  const match = nodes.find((node) => node.slug === head);
  if (!match) return null;
  if (rest.length === 0) return match;
  return findNodeByPath(match.children, rest);
};

/** Resolve the slug path (breadcrumb) that leads to a given node id. */
export const findSlugPathById = (
  nodes: WorkspaceNavNode[],
  target_id: number,
  trail: string[] = []
): string[] | null => {
  for (const node of nodes) {
    const next_trail = [...trail, node.slug];
    if (node.id === target_id) return next_trail;
    const found = findSlugPathById(node.children, target_id, next_trail);
    if (found) return found;
  }
  return null;
};

/** Map an API workspace to the shape the switcher / browse modal already expect. */
export const mapWorkspaceToBrowse = (workspace: Workspace): BrowseWorkspace => ({
  id: workspace.slug,
  name: workspace.name,
  mono: workspace.mono,
  color: workspace.color,
  is_home: workspace.is_home,
  product: workspace.product,
  role: workspace.role ?? undefined,
  memberships: workspace.memberships as WorkspaceMembership[],
});
