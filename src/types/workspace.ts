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

/**
 * A board's privacy level, shown as "Board type" in its info popover.
 * "main" — visible to every workspace member (the default).
 * "private" — only visible to people explicitly added to the board.
 * "shareable" — visible to workspace members and can also be shared externally.
 */
export type BoardType = "main" | "private" | "shareable";

/** Minimal creator profile embedded on a {@link WorkspaceNavNode}, shown in its info popover. */
export type WorkspaceNavNodeCreator = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

/** Minimal owner profile embedded on a {@link WorkspaceNavNode}, shown in its info popover. */
export type WorkspaceNavNodeOwner = {
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
  board_type: BoardType;
  is_favorite: boolean;
  position: number;
  created_at: string | null;
  creator: WorkspaceNavNodeCreator | null;
  /** Boards don't have their own owner list, so they inherit the workspace's owners. */
  owners: WorkspaceNavNodeOwner[];
  children: WorkspaceNavNode[];
};

/** One ancestor entry in a {@link BoardDetail}'s breadcrumb. */
export type BoardBreadcrumbItem = {
  id: number;
  label: string;
  slug: string;
};

/** Minimal workspace context embedded on a {@link BoardDetail}. */
export type BoardWorkspaceSummary = {
  id: number;
  slug: string;
  name: string;
};

/**
 * A single navigation item resolved by id alone (via `GET /api/boards/{id}`),
 * for the `/boards/{id}` route — which never carries a workspace slug, so the
 * owning workspace and the ancestor trail come back on the payload itself.
 */
export type BoardDetail = WorkspaceNavNode & {
  workspace: BoardWorkspaceSummary;
  breadcrumb: BoardBreadcrumbItem[];
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
  board_type?: BoardType;
};

/** Payload for updating a navigation item (rename / favorite / edit / change board type). */
export type UpdateNavItemPayload = {
  label?: string;
  icon?: string | null;
  view_key?: string | null;
  href?: string | null;
  display_style?: string | null;
  board_type?: BoardType;
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
