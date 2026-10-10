import { apiClient } from "@/lib/api-client";
import type {
  BoardDetail,
  BulkNavItemsPayload,
  CreateNavItemPayload,
  CreateWorkspacePayload,
  MoveNavItemPayload,
  MoveNavItemToWorkspaceResult,
  ReorderNavItemsPayload,
  SaveNavTemplateMode,
  SortNavItemsPayload,
  UpdateNavCollapseStatePayload,
  UpdateNavItemPayload,
  UpdateWorkspaceMemberRolePayload,
  UpdateWorkspacePayload,
  UpdateWorkspacePriorityPayload,
  UseNavTemplatePayload,
  Workspace,
  WorkspaceContentCreator,
  WorkspaceContentFilters,
  WorkspaceContentItem,
  WorkspaceContentPage,
  WorkspaceMember,
  WorkspaceNavigationTreeResponse,
  WorkspaceNavNode,
  TransferOwnershipPayload,
  TransferOwnershipResult,
} from "@/types/workspace";

/**
 * Talks to the Laravel workspace API. Every call goes through the shared
 * {@link apiClient}, so it inherits the bearer-token auth + 401 refresh handling.
 */
/**
 * Window event fired when a board's sidebar facing data changes outside the
 * sidebar itself (for example the board type picked in the board header), so
 * the nav tree, Favorites and Recent lists reload and show the new icon.
 */
export const NAV_ITEM_CHANGED_EVENT = "workspace-nav:item-changed";

export const notifyNavItemChanged = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NAV_ITEM_CHANGED_EVENT));
};

export const workspaceService = {
  /** GET /api/workspaces — the full catalog for the switcher / browse modal. */
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await apiClient.get<{ data: Workspace[] }>("/api/workspaces");
    return response.data;
  },

  /** POST /api/workspaces — create a workspace (creator becomes owner). */
  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    const response = await apiClient.post<{ workspace: Workspace }>(
      "/api/workspaces",
      payload
    );
    return response.workspace;
  },

  /** PATCH /api/workspaces/{slug} — rename or change type/appearance (owner only). */
  async updateWorkspace(
    workspace_slug: string,
    payload: UpdateWorkspacePayload
  ): Promise<Workspace> {
    const response = await apiClient.patch<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}`,
      payload
    );
    return response.workspace;
  },

  /**
   * POST /api/workspaces/{slug}/avatar — uploads (or replaces) the
   * workspace's custom avatar image, shown instead of its generated
   * mono/color badge. Owner/admin only.
   */
  async uploadWorkspaceAvatar(workspace_slug: string, file: File): Promise<Workspace> {
    const form_data = new FormData();
    form_data.append("file", file);
    const response = await apiClient.postFormData<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/avatar`,
      form_data
    );
    return response.workspace;
  },

  /**
   * DELETE /api/workspaces/{slug}/avatar — removes the workspace's custom
   * avatar, reverting it to its generated mono/color badge. Owner/admin only.
   */
  async removeWorkspaceAvatar(workspace_slug: string): Promise<Workspace> {
    const response = await apiClient.delete<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/avatar`
    );
    return response.workspace;
  },

  /**
   * POST /api/workspaces/{slug}/cover, uploads (or replaces) the banner image
   * shown at the top of Manage Workspace. Owner/admin only.
   */
  async uploadWorkspaceCover(workspace_slug: string, file: File, cover_position_y = 50): Promise<Workspace> {
    const form_data = new FormData();
    form_data.append("file", file);
    form_data.append("cover_position_y", String(Math.round(cover_position_y)));
    const response = await apiClient.postFormData<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/cover`,
      form_data
    );
    return response.workspace;
  },

  /**
   * PATCH /api/workspaces/{slug}/cover, saves the cover's vertical focal point
   * after it was dragged into place. Owner/admin only.
   */
  async updateWorkspaceCoverPosition(workspace_slug: string, cover_position_y: number): Promise<Workspace> {
    const response = await apiClient.patch<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/cover`,
      { cover_position_y: Math.round(cover_position_y) }
    );
    return response.workspace;
  },

  /**
   * DELETE /api/workspaces/{slug}/cover, removes the custom cover so the
   * banner falls back to the default image. Owner/admin only.
   */
  async removeWorkspaceCover(workspace_slug: string): Promise<Workspace> {
    const response = await apiClient.delete<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/cover`
    );
    return response.workspace;
  },

  /**
   * PATCH /api/workspaces/{slug}/priority — flags/unflags this workspace as a
   * priority client (the sidebar's priority star), open to any member.
   */
  async updateWorkspacePriority(
    workspace_slug: string,
    payload: UpdateWorkspacePriorityPayload
  ): Promise<Workspace> {
    const response = await apiClient.patch<{ workspace: Workspace }>(
      `/api/workspaces/${workspace_slug}/priority`,
      payload
    );
    return response.workspace;
  },

  /** DELETE /api/workspaces/{slug} — soft-delete the workspace (owner only). */
  async deleteWorkspace(workspace_slug: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}`);
  },

  /**
   * PATCH /api/workspaces/{slug}/activate — records this workspace as the one
   * the current user last had open, so it's restored on their next login/page
   * reload instead of always defaulting to the home workspace.
   */
  async activateWorkspace(workspace_slug: string): Promise<void> {
    await apiClient.patch(`/api/workspaces/${workspace_slug}/activate`);
  },

  /** POST /api/workspaces/{slug}/leave — remove the current user from the workspace. */
  async leaveWorkspace(workspace_slug: string): Promise<void> {
    await apiClient.post(`/api/workspaces/${workspace_slug}/leave`);
  },

  /**
   * POST /api/workspaces/{slug}/transfer-ownership, hands the "owner" role
   * to another member and sets what happens to the current owner (a new
   * role, or leaving the workspace) in one atomic step. Owner only.
   */
  async transferOwnership(
    workspace_slug: string,
    payload: TransferOwnershipPayload
  ): Promise<TransferOwnershipResult> {
    return apiClient.post<TransferOwnershipResult>(
      `/api/workspaces/${workspace_slug}/transfer-ownership`,
      payload
    );
  },

  /** GET /api/workspaces/{slug} — a single workspace's own details (name/mono/color/role/…). */
  async getWorkspace(workspace_slug: string): Promise<Workspace> {
    return apiClient.get<Workspace>(`/api/workspaces/${workspace_slug}`);
  },

  /**
   * GET /api/workspaces/by-id/{workspace_id} — same payload as
   * {@link getWorkspace}, resolved by the workspace's numeric id instead of
   * its slug. Used by the `/workspaces/{workspace_id}/...` routes, which only
   * have the id on hand from the URL itself.
   */
  async getWorkspaceById(workspace_id: number): Promise<Workspace> {
    return apiClient.get<Workspace>(`/api/workspaces/by-id/${workspace_id}`);
  },

  /**
   * GET /api/workspaces/{slug}/members — the full member roster, for the Collaborations tab.
   * With `include_deactivated`, deleted accounts are included too (flagged `is_deactivated`), so a
   * board can still show them, faded, on the items they were assigned to.
   */
  async getWorkspaceMembers(workspace_slug: string, options: { include_deactivated?: boolean } = {}): Promise<WorkspaceMember[]> {
    const query = options.include_deactivated ? "?include_deactivated=1" : "";
    const response = await apiClient.get<{ data: WorkspaceMember[] }>(
      `/api/workspaces/${workspace_slug}/members${query}`
    );
    return response.data;
  },

  /**
   * PATCH /api/workspaces/{slug}/members/{member_id} — changes a member's
   * role (owner/privileged staff only). A member can never change their own
   * role here — that goes through "Transfer ownership" or "Leave workspace".
   */
  async updateWorkspaceMemberRole(
    workspace_slug: string,
    member_id: number,
    payload: UpdateWorkspaceMemberRolePayload
  ): Promise<WorkspaceMember> {
    const response = await apiClient.patch<{ data: WorkspaceMember }>(
      `/api/workspaces/${workspace_slug}/members/${member_id}`,
      payload
    );
    return response.data;
  },

  /**
   * DELETE /api/workspaces/{slug}/members/{member_id} — removes a member from
   * the workspace (owner/privileged staff only). The workspace's creator and
   * the acting user's own membership can never be removed this way.
   */
  async removeWorkspaceMember(workspace_slug: string, member_id: number): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}/members/${member_id}`);
  },

  /**
   * GET /api/workspaces/{slug}/content/recent — the workspace's most
   * recently created boards/docs, at any depth in its navigation tree
   * (the same rows the sidebar renders).
   */
  async getRecentContentItems(workspace_slug: string, limit = 10): Promise<WorkspaceContentItem[]> {
    const response = await apiClient.get<{ data: WorkspaceContentItem[] }>(
      `/api/workspaces/${workspace_slug}/content/recent?limit=${limit}`
    );
    return response.data;
  },

  /**
   * GET /api/content — every board/doc across every workspace the current
   * user belongs to, paginated (the same rows the sidebar renders). Accepts
   * the Content tab's "Filter by" facets, applied server-side.
   */
  async getContentItems(
    page = 1,
    per_page = 30,
    filters?: Partial<WorkspaceContentFilters>
  ): Promise<WorkspaceContentPage> {
    const params = new URLSearchParams({ page: String(page), per_page: String(per_page) });
    filters?.last_modified?.forEach((value) => params.append("last_modified[]", value));
    filters?.asset_type?.forEach((value) => params.append("asset_type[]", value));
    filters?.created_by?.forEach((value) => params.append("created_by[]", String(value)));
    filters?.membership?.forEach((value) => params.append("membership[]", value));

    return apiClient.get<WorkspaceContentPage>(`/api/content?${params.toString()}`);
  },

  /**
   * GET /api/content/creators — every distinct creator behind the current
   * user's accessible content, with their content count. Populates the
   * Content tab's "Created by" filter list.
   */
  async getContentCreators(): Promise<WorkspaceContentCreator[]> {
    const response = await apiClient.get<{ data: WorkspaceContentCreator[] }>("/api/content/creators");
    return response.data;
  },

  /**
   * GET /api/boards/{id} — resolve a single navigation item by its
   * globally-unique id, with its owning workspace and ancestor breadcrumb.
   * This is what the `/boards/{id}` route resolves against.
   */
  async getBoard(item_id: number): Promise<BoardDetail> {
    return apiClient.get<BoardDetail>(`/api/boards/${item_id}`);
  },

  /**
   * GET /api/workspaces/{slug}/navigation — the full navigation tree, plus
   * which of its folders the current user currently has collapsed.
   */
  async getNavigationTree(workspace_slug: string): Promise<WorkspaceNavigationTreeResponse> {
    return apiClient.get<WorkspaceNavigationTreeResponse>(
      `/api/workspaces/${workspace_slug}/navigation`
    );
  },

  /**
   * PUT /api/workspaces/{slug}/navigation/collapsed-state — saves the
   * viewer's own collapsed/expanded set of sidebar folders for this
   * workspace, so it's remembered per user across page reloads.
   */
  async updateNavCollapseState(
    workspace_slug: string,
    payload: UpdateNavCollapseStatePayload
  ): Promise<number[]> {
    const response = await apiClient.put<{ collapsed_group_ids: number[] }>(
      `/api/workspaces/${workspace_slug}/navigation/collapsed-state`,
      payload
    );
    return response.collapsed_group_ids;
  },

  /** POST /api/workspaces/{slug}/navigation — create a folder or view. */
  async createNavItem(
    workspace_slug: string,
    payload: CreateNavItemPayload
  ): Promise<WorkspaceNavNode> {
    const response = await apiClient.post<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation`,
      payload
    );
    return response.item;
  },

  /** PATCH /api/workspaces/{slug}/navigation/{id} — rename / favorite / edit. */
  async updateNavItem(
    workspace_slug: string,
    item_id: number,
    payload: UpdateNavItemPayload
  ): Promise<WorkspaceNavNode> {
    const response = await apiClient.patch<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation/${item_id}`,
      payload
    );
    return response.item;
  },

  /** PATCH /api/workspaces/{slug}/navigation/{id}/move — reparent / reorder. */
  async moveNavItem(
    workspace_slug: string,
    item_id: number,
    payload: MoveNavItemPayload
  ): Promise<WorkspaceNavNode> {
    const response = await apiClient.patch<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation/${item_id}/move`,
      payload
    );
    return response.item;
  },

  /**
   * PATCH /api/workspaces/{slug}/navigation/reorder — sidebar drag-and-drop
   * reordering (and the "Move up"/"Move down" quick actions), resequenced
   * server-side in one transaction, mirroring `reorderItems` on the board API.
   */
  async reorderNavItems(
    workspace_slug: string,
    payload: ReorderNavItemsPayload
  ): Promise<WorkspaceNavNode[]> {
    const response = await apiClient.patch<{ items: WorkspaceNavNode[] }>(
      `/api/workspaces/${workspace_slug}/navigation/reorder`,
      payload
    );
    return response.items;
  },

  /** POST /api/workspaces/{slug}/navigation/bulk, the sidebar's multi-select bulk bar (move, archive, delete). */
  async bulkNavItems(workspace_slug: string, payload: BulkNavItemsPayload): Promise<void> {
    await apiClient.post(`/api/workspaces/${workspace_slug}/navigation/bulk`, payload);
  },

  /** PATCH /api/workspaces/{slug}/navigation/sort, the sidebar's "Sort A to Z" (folders first, saved as the manual order). */
  async sortNavItems(workspace_slug: string, payload: SortNavItemsPayload): Promise<void> {
    await apiClient.patch(`/api/workspaces/${workspace_slug}/navigation/sort`, payload);
  },

  /** POST /api/workspaces/{slug}/navigation/{id}/duplicate — deep-copy a subtree. */
  async duplicateNavItem(
    workspace_slug: string,
    item_id: number
  ): Promise<WorkspaceNavNode> {
    const response = await apiClient.post<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation/${item_id}/duplicate`
    );
    return response.item;
  },

  /** PATCH /api/workspaces/{slug}/navigation/{id}/move-workspace, moves a board or folder to another workspace's root. */
  async moveNavItemToWorkspace(
    workspace_slug: string,
    item_id: number,
    target_workspace_id: number
  ): Promise<MoveNavItemToWorkspaceResult> {
    return apiClient.patch<MoveNavItemToWorkspaceResult>(
      `/api/workspaces/${workspace_slug}/navigation/${item_id}/move-workspace`,
      { workspace_id: target_workspace_id }
    );
  },

  /** POST /api/workspaces/{slug}/navigation/{id}/template, "Save as a template" (copy) or "Move to template" (move). */
  async saveNavItemAsTemplate(workspace_slug: string, item_id: number, mode: SaveNavTemplateMode): Promise<WorkspaceNavNode> {
    const response = await apiClient.post<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation/${item_id}/template`,
      { mode }
    );
    return response.item;
  },

  /** GET /api/workspaces/{slug}/navigation/templates, the workspace's saved board templates, newest first. */
  async getNavTemplates(workspace_slug: string): Promise<WorkspaceNavNode[]> {
    const response = await apiClient.get<{ data: WorkspaceNavNode[] }>(`/api/workspaces/${workspace_slug}/navigation/templates`);
    return response.data;
  },

  /** POST /api/workspaces/{slug}/navigation/templates/{id}/use, creates a new board from a template. */
  async useNavTemplate(workspace_slug: string, template_id: number, payload: UseNavTemplatePayload): Promise<WorkspaceNavNode> {
    const response = await apiClient.post<{ item: WorkspaceNavNode }>(
      `/api/workspaces/${workspace_slug}/navigation/templates/${template_id}/use`,
      payload
    );
    return response.item;
  },

  /** DELETE /api/workspaces/{slug}/navigation/templates/{id} */
  async deleteNavTemplate(workspace_slug: string, template_id: number): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}/navigation/templates/${template_id}`);
  },

  /** DELETE /api/workspaces/{slug}/navigation/{id} — archive (soft-delete). */
  async deleteNavItem(workspace_slug: string, item_id: number): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}/navigation/${item_id}`);
  },
};
