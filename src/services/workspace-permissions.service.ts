import { apiClient } from "@/lib/api-client";
import type { PermissionGroup, PermissionMatrix, PermissionRole } from "@/components/permissions/types";

export type WorkspacePermissionsPayload = {
  roles: PermissionRole[];
  groups: PermissionGroup[];
  matrix: PermissionMatrix;
};

export type UpdateWorkspacePermissionPayload = {
  role: string;
  permission_key: string;
  allowed: boolean;
};

/**
 * Talks to the Laravel default-role permission matrix for Manage Workspace's
 * "Permissions" tab. The catalog (roles/groups/labels) is shared across every
 * workspace — only the grants are stored data, editable via `update`.
 */
export const workspacePermissionsService = {
  /** GET /api/workspace-permissions — restricted to WORKSPACE_PERMISSIONS_MANAGER_ROLES. */
  async getPermissions(): Promise<WorkspacePermissionsPayload> {
    return apiClient.get<WorkspacePermissionsPayload>("/api/workspace-permissions");
  },

  /** PATCH /api/workspace-permissions — restricted to WORKSPACE_PERMISSIONS_MANAGER_ROLES; toggles a single grant. */
  async updatePermission(payload: UpdateWorkspacePermissionPayload): Promise<void> {
    await apiClient.patch("/api/workspace-permissions", payload);
  },
};
