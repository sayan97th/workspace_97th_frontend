import { apiClient } from "@/lib/api-client";
import type {
  CreateNavItemPayload,
  CreateWorkspacePayload,
  MoveNavItemPayload,
  UpdateNavItemPayload,
  Workspace,
  WorkspaceNavNode,
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
