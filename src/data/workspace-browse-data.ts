/**
 * Data model for the "Browse all workspaces" modal.
 *
 * Extends the lightweight {@link WorkspaceSummary} used by the sidebar switcher
 * with the extra fields the browse cards need (product label, membership role).
 * Kept separate from the component so the same catalog can later be sourced from
 * the API without touching the presentation layer.
 */
import type { WorkspaceSummary } from "./workspace-switcher-data";
import { default_workspace_color } from "./workspace-switcher-data";
import type { WorkspacePrivacy } from "./workspace-create-data";

/** Membership buckets a workspace can belong to (drives the left-nav tabs). */
export type WorkspaceMembership = "recent" | "owner" | "member" | "collaborator";

/** Left-nav tabs in the browse modal. "all" is the catch-all view. */
export type WorkspaceBrowseTab = "all" | WorkspaceMembership;

export type BrowseWorkspace = WorkspaceSummary & {
  /** Product/source label shown under the workspace name (e.g. "monday"). */
  product: string;
  /** Membership role shown on the right of the card, when the user has one. */
  role?: string;
  /** Which membership buckets this workspace appears under. */
  memberships: WorkspaceMembership[];
  /** Set for workspaces created via the "Add new workspace" dialog. */
  privacy?: WorkspacePrivacy;
};

export const browse_workspaces: BrowseWorkspace[] = [
  {
    id: "fulfillment",
    name: "Fulfillment",
    mono: "97",
    color: default_workspace_color,
    is_home: true,
    product: "Workspace 97th",
    role: "Member",
    memberships: ["recent", "member"],
  },
  {
    id: "base",
    name: "BASE",
    mono: "B",
    color: "#2f6fed",
    product: "Workspace 97th",
    memberships: [],
  },
  {
    id: "crm",
    name: "CRM",
    mono: "C",
    color: "#4cc3e0",
    product: "Sales CRM",
    memberships: [],
  },
  {
    id: "decision-priority-matrix",
    name: "Decision Priority Matrix",
    mono: "D",
    color: "#6b7280",
    product: "Workspace 97th",
    memberships: [],
  },
  {
    id: "highrise",
    name: "Highrise",
    mono: "H",
    color: "#26312f",
    product: "Workspace 97th",
    memberships: [],
  },
  {
    id: "partnerships",
    name: "Partnerships",
    mono: "P",
    color: "#2f9e68",
    product: "Workspace 97th",
    memberships: [],
  },
  {
    id: "personal",
    name: "Personal",
    mono: "P",
    color: "#e8a317",
    product: "Workspace 97th",
    memberships: [],
  },
];

/** Heading shown above the results grid for each tab. */
export const browse_tab_titles: Record<WorkspaceBrowseTab, string> = {
  all: "All workspaces",
  recent: "Recent workspaces",
  owner: "Owner",
  member: "Workspaces I'm a member of",
  collaborator: "Collaborator",
};

/** Empty-state heading shown when a tab has no (matching) workspaces. */
export const browse_tab_empty_titles: Record<WorkspaceBrowseTab, string> = {
  all: "No workspaces match your search",
  recent: "No recent workspaces match your search",
  owner: "You are not an owner of any workspace",
  member: "You are not a member of any workspace",
  collaborator: "You are not a collaborator in any workspace",
};

/**
 * Filters the catalog down to a tab and (optionally) a search query. The "all"
 * tab returns everything; the membership tabs match the workspace's buckets.
 */
export const filterBrowseWorkspaces = (
  workspaces: BrowseWorkspace[],
  tab: WorkspaceBrowseTab,
  query: string
): BrowseWorkspace[] => {
  const by_tab =
    tab === "all"
      ? workspaces
      : workspaces.filter((workspace) => workspace.memberships.includes(tab));

  const normalized = query.trim().toLowerCase();
  if (!normalized) return by_tab;
  return by_tab.filter((workspace) =>
    workspace.name.toLowerCase().includes(normalized)
  );
};
