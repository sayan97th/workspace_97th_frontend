/**
 * API types for the dynamic workspace sidebar.
 *
 * These mirror the Laravel `WorkspaceResource` and `WorkspaceNavigationItemResource`
 * payloads. The navigation tree is self-similar: every node carries the same
 * fields and an array of `children`, so nesting is unbounded (folders inside
 * folders inside folders…). `type: "group"` behaves like a folder, `type: "leaf"`
 * is a navigable view.
 */

import type { WorkspaceMembershipRole } from "@/types/invitation";

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
  /** Custom name for the board's first (item name) column; null falls back to "Item". */
  item_column_label: string | null;
  /** Custom width (px) for the board's first (item name) column, persisted from its resize handle; null falls back to auto-sizing from the longest item name. */
  item_column_width: number | null;
  /** Custom width (px) for every subitem tree's first (subitem name) column, persisted from its resize handle; null falls back to auto-sizing from the longest subitem name within each item. */
  sub_item_column_width: number | null;
  is_favorite: boolean;
  /** Priority flag for this sidebar item — the same "sorts above the rest" star from a board's items/subitems, brought to the nav tree so a high-priority board/folder is easy to spot at a glance. Purely a visual signal (like item/subitem priority), not a sort key. */
  is_priority: boolean;
  /** Hidden from the sidebar/nav tree and the workspace's Content tab without being deleted — see the board options menu's "Archive board" / "View archive / trash". */
  is_archived: boolean;
  /** Total updates (top-level + replies) on the board's discussion feed; only populated on {@link BoardDetail} (0 elsewhere). */
  comments_count: number;
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
  /** Whether the current user has discussion updates they haven't seen yet — drives the "Board updates" badge's red/gray state. */
  has_unseen_comments: boolean;
  /** Whether the current user may archive/delete/restore this board or change its settings — the board's creator, its workspace's owner, or an admin. Drives the board options menu's management-only rows. */
  can_manage: boolean;
};

export type Workspace = {
  id: number;
  name: string;
  slug: string;
  /** 1-2 character monogram shown in the badge. */
  mono: string;
  /** Badge background color (hex), shown behind the monogram when no avatar_url is set. */
  color: string;
  /** Full-size uploaded avatar image, or null to use the generated mono/color badge. */
  avatar_url: string | null;
  /** Small square-cropped version of avatar_url, used by the compact badges (sidebar switcher, browse modal). */
  avatar_thumbnail_url: string | null;
  /** Product/source label shown under the name in the browse modal. */
  product: string;
  /** "open" — any account member can join; "closed" — invite-only. */
  privacy: "open" | "closed";
  is_home: boolean;
  /** Priority client flag — sorts this workspace above regular ones in the switcher/browse lists, the same way a priority item sorts above the rest within a board. Toggled from the sidebar's priority star. */
  is_priority: boolean;
  description: string | null;
  position: number;
  /** Human role label for the current user (e.g. "Owner"), null when not a member. */
  role: string | null;
  /** Membership buckets the current user has for this workspace (e.g. ["member","recent"]). */
  memberships: string[];
  /**
   * Id of this workspace's "Manage Workspace" navigation leaf (its
   * `view_key: "workspace_manage"` board), or null if it hasn't been seeded
   * yet. Lets `/workspaces/{workspace_id}/...` resolve straight to the board
   * that renders Manage Workspace without a separate navigation-tree lookup.
   */
  manage_node_id: number | null;
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
  item_column_label?: string | null;
  item_column_width?: number | null;
  sub_item_column_width?: number | null;
  is_favorite?: boolean;
  is_priority?: boolean;
};

/** Payload for `PATCH /api/workspaces/{slug}/priority` — flags/unflags a priority client. */
export type UpdateWorkspacePriorityPayload = {
  is_priority: boolean;
};

/** Payload for moving a navigation item to a new parent / position. */
export type MoveNavItemPayload = {
  parent_id?: number | null;
  position?: number;
};

/**
 * Payload for `PATCH /api/workspaces/{slug}/navigation/reorder` — a sidebar
 * drag-and-drop reorder (or a "Move up"/"Move down" quick action, which is
 * just a two-item reorder under the hood). `target_ordered_ids` is the full
 * new sibling order under `target_parent_id` (a folder id, or `null` for the
 * workspace root), including the moved item itself. `source_parent_id` /
 * `source_ordered_ids` are only needed when the item changed folders, so the
 * old parent's remaining children are resequenced too.
 */
export type ReorderNavItemsPayload = {
  moved_item_id: number;
  target_parent_id: number | null;
  target_ordered_ids: number[];
  source_parent_id?: number | null;
  source_ordered_ids?: number[];
};

/**
 * Response shape for `GET /api/workspaces/{slug}/navigation` — the tree plus
 * which of its folders the current user currently has collapsed (a personal
 * preference, mirrors the board tables' `collapsed_group_ids`).
 */
export type WorkspaceNavigationTreeResponse = {
  data: WorkspaceNavNode[];
  collapsed_group_ids: number[];
};

/** Payload for `PUT /api/workspaces/{slug}/navigation/collapsed-state`. */
export type UpdateNavCollapseStatePayload = {
  collapsed_group_ids: number[];
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

/** A workspace member, from `GET /api/workspaces/{slug}/members` — Manage Workspace's Collaborations tab. */
export type WorkspaceMember = {
  id: number;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  role: string | null;
  is_recent: boolean;
  /** Id of the user who invited this member, null when unknown (e.g. the workspace's creator). */
  invited_by: number | null;
  joined_at: string | null;
  /** Whether this member is the workspace's original creator — permanent, and never removable regardless of their current role. */
  is_creator: boolean;
};

/** Payload for `PATCH /api/workspaces/{slug}/members/{member_id}`. */
export type UpdateWorkspaceMemberRolePayload = {
  role: WorkspaceMembershipRole;
};

/** The role the current owner keeps after handing off ownership, or `"leave"` to exit the workspace entirely. */
export type SelfRoleAfterTransfer = "member" | "viewer" | "leave";

/** Payload for `POST /api/workspaces/{slug}/transfer-ownership`. */
export type TransferOwnershipPayload = {
  new_owner_id: number;
  self_role: SelfRoleAfterTransfer;
};

/** Response for `POST /api/workspaces/{slug}/transfer-ownership`. */
export type TransferOwnershipResult = {
  message: string;
  /** True when `self_role` was `"leave"`, meaning the caller is no longer a member. */
  left: boolean;
};

/** A content item's creator, embedded on a {@link WorkspaceContentItem}. */
export type WorkspaceContentItemCreator = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

/** Coarse content kind, derived server-side from `view_key` — drives the Content tab's "Asset type" filter and row icon. */
export type WorkspaceContentAssetType = "board" | "doc" | "dashboard" | "workflow";

/** One "Last modified" cutoff bucket in the Content tab's filter panel — "N+ ago". */
export type WorkspaceContentLastModifiedBucket = "1m" | "3m" | "6m" | "1y" | "2y";

/** The current user's relationship to a content item's owning workspace, for the "Membership" filter. */
export type WorkspaceContentMembership = "owner" | "member";

/** Selected "Filter by" facets for `GET /api/content`; an empty array means that facet is unfiltered. */
export type WorkspaceContentFilters = {
  last_modified: WorkspaceContentLastModifiedBucket[];
  asset_type: WorkspaceContentAssetType[];
  created_by: number[];
  membership: WorkspaceContentMembership[];
};

/** A distinct creator behind the current user's accessible content, from `GET /api/content/creators` — populates the "Created by" filter list. */
export type WorkspaceContentCreator = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  content_count: number;
};

/** The workspace a {@link WorkspaceContentItem} belongs to. */
export type WorkspaceContentItemWorkspace = {
  id: number;
  slug: string;
  name: string;
};

/** One ancestor group in a {@link WorkspaceContentItem}'s `folder_path`. */
export type WorkspaceContentItemFolder = {
  id: number;
  label: string;
};

/**
 * A board/doc leaf, listed outside its workspace's navigation tree — Manage
 * Workspace's "Recents" (scoped to one workspace) and "Content" (app-wide)
 * tabs. This is deliberately the same kind of row the sidebar itself
 * renders, not a board's internal view/tabs — mirrors the Laravel
 * `WorkspaceContentItemResource` payload.
 */
export type WorkspaceContentItem = {
  id: number;
  label: string;
  type: WorkspaceNavNodeType;
  asset_type: WorkspaceContentAssetType;
  display_style: string | null;
  board_type: BoardType;
  icon: string | null;
  is_favorite: boolean;
  created_at: string | null;
  updated_at: string | null;
  creator: WorkspaceContentItemCreator | null;
  workspace: WorkspaceContentItemWorkspace | null;
  folder_path: WorkspaceContentItemFolder[];
};

/** Pagination metadata returned alongside a `GET /api/content` page. */
export type WorkspaceContentPageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type WorkspaceContentPage = {
  data: WorkspaceContentItem[];
  meta: WorkspaceContentPageMeta;
};
