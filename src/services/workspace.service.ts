import { apiClient } from "@/lib/api-client";
import type {
  BoardDetail,
  CreateNavItemPayload,
  CreateWorkspacePayload,
  MoveNavItemPayload,
  UpdateNavItemPayload,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceContentCreator,
  WorkspaceContentFilters,
  WorkspaceContentItem,
  WorkspaceContentPage,
  WorkspaceMember,
  WorkspaceNavNode,
  TransferOwnershipPayload,
  TransferOwnershipResult,
} from "@/types/workspace";

/**
 * Talks to the Laravel workspace API. Every call goes through the shared
 * {@link apiClient}, so it inherits the bearer-token auth + 401 refresh handling.
 */
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

  /** DELETE /api/workspaces/{slug} — soft-delete the workspace (owner only). */
  async deleteWorkspace(workspace_slug: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}`);
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

  /** GET /api/workspaces/{slug}/members — the full member roster, for the Collaborations tab. */
  async getWorkspaceMembers(workspace_slug: string): Promise<WorkspaceMember[]> {
    const response = await apiClient.get<{ data: WorkspaceMember[] }>(
      `/api/workspaces/${workspace_slug}/members`
    );
    return response.data;
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

  /** GET /api/workspaces/{slug}/navigation — the full navigation tree. */
  async getNavigationTree(workspace_slug: string): Promise<WorkspaceNavNode[]> {
    const response = await apiClient.get<{ data: WorkspaceNavNode[] }>(
      `/api/workspaces/${workspace_slug}/navigation`
    );
    return response.data;
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

  /** DELETE /api/workspaces/{slug}/navigation/{id} — archive (soft-delete). */
  async deleteNavItem(workspace_slug: string, item_id: number): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspace_slug}/navigation/${item_id}`);
  },
};
