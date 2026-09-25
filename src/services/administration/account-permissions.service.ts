import { apiClient } from "@/lib/api-client";
import type {
  AccountPermissionKey,
  AccountPermissionsDto,
  UpdateAccountPermissionsPayload,
} from "@/types/administration/account-permissions";

/** Talks to the Laravel account permissions endpoints (Administration > Permissions). */
export const accountPermissionsService = {
  /** GET /api/admin/account-settings/permissions */
  async getPermissions(): Promise<AccountPermissionsDto> {
    return apiClient.get<AccountPermissionsDto>("/api/admin/account-settings/permissions");
  },

  /** PATCH /api/admin/account-settings/permissions, a partial matrix merged over the stored one. */
  async updatePermissions(payload: UpdateAccountPermissionsPayload): Promise<AccountPermissionsDto> {
    return apiClient.patch<AccountPermissionsDto>("/api/admin/account-settings/permissions", payload);
  },

  /** GET /api/account-permissions/me, the signed in user's own effective permissions. */
  async getMyPermissions(): Promise<Record<AccountPermissionKey, boolean>> {
    const response = await apiClient.get<{ permissions: Record<AccountPermissionKey, boolean> }>(
      "/api/account-permissions/me"
    );
    return response.permissions;
  },
};
