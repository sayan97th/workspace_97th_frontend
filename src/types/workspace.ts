/**
 * API types for the dynamic workspace sidebar.
 *
 * These mirror the Laravel `WorkspaceResource` and `WorkspaceNavigationItemResource`
 * payloads. The navigation tree is self-similar: every node carries the same
 * fields and an array of `children`, so nesting is unbounded (folders inside
 * folders inside folders…). `type: "group"` behaves like a folder, `type: "leaf"`
 * is a navigable view.
 */

export type WorkspaceNavNodeType = "group" | "leaf";

/** Minimal creator profile embedded on a {@link WorkspaceNavNode}, shown in its info popover. */
export type WorkspaceNavNodeCreator = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

export type WorkspaceNavNode = {
  id: number;
  workspace_id: number;
  parent_id: number | null;
  type: WorkspaceNavNodeType;
  label: string;
  description: string | null;
  slug: string;
  icon: string | null;
  view_key: string | null;
  href: string | null;
  display_style: string | null;
  is_favorite: boolean;
  position: number;
  created_at: string | null;
  creator: WorkspaceNavNodeCreator | null;
  children: WorkspaceNavNode[];
};

export type Workspace = {
  id: number;
  name: string;
  slug: string;
  /** 1-2 character monogram shown in the badge. */
  mono: string;
  /** Badge background color (hex). */
  color: string;
  /** Product/source label shown under the name in the browse modal. */
  product: string;
  /** "open" — any account member can join; "closed" — invite-only. */
  privacy: "open" | "closed";
  is_home: boolean;
  description: string | null;
  position: number;
  /** Human role label for the current user (e.g. "Owner"), null when not a member. */
  role: string | null;
  /** Membership buckets the current user has for this workspace (e.g. ["member","recent"]). */
  memberships: string[];
};

/** Payload for creating a navigation item (folder or view). */
export type CreateNavItemPayload = {
  type: WorkspaceNavNodeType;
  label: string;
  parent_id?: number | null;
  icon?: string | null;
  view_key?: string | null;
  href?: string | null;
  display_style?: string | null;
};

/** Payload for updating a navigation item (rename / favorite / edit). */
export type UpdateNavItemPayload = {
  label?: string;
  icon?: string | null;
  view_key?: string | null;
  href?: string | null;
  display_style?: string | null;
  is_favorite?: boolean;
};

/** Payload for moving a navigation item to a new parent / position. */
export type MoveNavItemPayload = {
  parent_id?: number | null;
  position?: number;
};

/** Payload for creating a workspace from the "Add new workspace" dialog. */
export type CreateWorkspacePayload = {
  name: string;
  description?: string | null;
  mono?: string | null;
  color?: string | null;
  product?: string | null;
  privacy?: "open" | "closed";
};

/** Payload for updating a workspace's own fields (rename / change type / etc). */
export type UpdateWorkspacePayload = {
  name?: string;
  description?: string | null;
  mono?: string | null;
  color?: string | null;
  product?: string | null;
  privacy?: "open" | "closed";
};
