import { apiClient } from "@/lib/api-client";
import type {
  AdminUserDetailsDto,
  AdminUserDto,
  BulkUserActionPayload,
  BulkUserActionResult,
  AdminUsersPage,
  AdminUsersQuery,
  InviteUserPayload,
  PlatformRoleName,
  SetUserPasswordPayload,
  StaffInvitationDto,
  UpdateAdminUserPayload,
} from "@/types/administration/admin-users";

const buildQuery = (query?: AdminUsersQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.type) params.set("type", query.type);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  if (query?.department !== undefined) params.set("department", String(query.department));
  if (query?.role) params.set("role", query.role);
  if (query?.account_status) params.set("account_status", query.account_status);
  if (query?.sort_field) params.set("sort_field", query.sort_field);
  if (query?.sort_direction) params.set("sort_direction", query.sort_direction);
  if (query?.ids?.length) params.set("ids", query.ids.join(","));
  Object.entries(query?.filter_params ?? {}).forEach(([key, value]) => params.set(key, value));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/users` and `/api/admin/roles` resources. */
export const adminUsersService = {
  /** GET /api/admin/users */
  async getUsers(query?: AdminUsersQuery): Promise<AdminUsersPage> {
    return apiClient.get<AdminUsersPage>(`/api/admin/users${buildQuery(query)}`);
  },

  /** GET /api/admin/users/{id} */
  async getUser(user_id: number): Promise<AdminUserDto> {
    return apiClient.get<AdminUserDto>(`/api/admin/users/${user_id}`);
  },

  /** PATCH /api/admin/users/{id} */
  async updateUser(user_id: number, payload: UpdateAdminUserPayload): Promise<AdminUserDto> {
    const response = await apiClient.patch<{ user: AdminUserDto }>(`/api/admin/users/${user_id}`, payload);
    return response.user;
  },

  /** DELETE /api/admin/users/{id} — soft deletes the account: no more sign in, but the person's history stays attributed to them. */
  async deleteUser(user_id: number): Promise<void> {
    await apiClient.delete<void>(`/api/admin/users/${user_id}`);
  },

  /** PATCH /api/admin/users/{id}/restore — brings a deleted account back exactly as it was. */
  async restoreUser(user_id: number): Promise<AdminUserDto> {
    const response = await apiClient.patch<{ user: AdminUserDto }>(`/api/admin/users/${user_id}/restore`, {});
    return response.user;
  },

  /** PATCH /api/admin/users/{id}/ban — deactivates the account. */
  async deactivateUser(user_id: number): Promise<AdminUserDto> {
    const response = await apiClient.patch<{ user: AdminUserDto }>(`/api/admin/users/${user_id}/ban`, {});
    return response.user;
  },

  /** PATCH /api/admin/users/{id}/unban — reactivates the account. */
  async reactivateUser(user_id: number): Promise<AdminUserDto> {
    const response = await apiClient.patch<{ user: AdminUserDto }>(`/api/admin/users/${user_id}/unban`, {});
    return response.user;
  },

  /** POST /api/admin/roles/users/{id}/assign — super_admin only on the backend. */
  async assignRole(user_id: number, role: PlatformRoleName): Promise<AdminUserDto> {
    const response = await apiClient.post<{ user: AdminUserDto }>(`/api/admin/roles/users/${user_id}/assign`, {
      role,
    });
    return response.user;
  },

  /** POST /api/admin/roles/users/{id}/revoke — super_admin only on the backend. */
  async revokeRole(user_id: number, role: PlatformRoleName): Promise<AdminUserDto> {
    const response = await apiClient.post<{ user: AdminUserDto }>(`/api/admin/roles/users/${user_id}/revoke`, {
      role,
    });
    return response.user;
  },

  /** PATCH /api/admin/users/{id}/password — sets the account's password directly. */
  async setPassword(user_id: number, payload: SetUserPasswordPayload): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`/api/admin/users/${user_id}/password`, payload);
  },

  /** POST /api/admin/users/{id}/send-password-reset-link — emails the account a reset link. */
  async sendPasswordResetLink(user_id: number): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/admin/users/${user_id}/send-password-reset-link`, {});
  },

  /** POST /api/admin/users/invite */
  async inviteUser(payload: InviteUserPayload): Promise<StaffInvitationDto> {
    const response = await apiClient.post<{ invitation: StaffInvitationDto }>("/api/admin/users/invite", payload);
    return response.invitation;
  },

  /** GET /api/admin/users/{id}/details, everything the user details drawer shows. */
  async getUserDetails(user_id: number): Promise<AdminUserDetailsDto> {
    return apiClient.get<AdminUserDetailsDto>(`/api/admin/users/${user_id}/details`);
  },

  /** POST /api/admin/users/bulk, one action applied to many users. Users the caller cannot manage are skipped. */
  async bulkAction(payload: BulkUserActionPayload): Promise<BulkUserActionResult> {
    return apiClient.post<BulkUserActionResult>("/api/admin/users/bulk", payload);
  },

  /** GET /api/admin/users/export, a CSV of the filtered (or selected) users. */
  async exportUsers(query?: AdminUsersQuery): Promise<Blob> {
    return apiClient.get<Blob>(`/api/admin/users/export${buildQuery(query)}`, { responseType: "blob" });
  },

  /** PUT /api/admin/users/{id}/profile-fields, sets (or clears with null) custom profile field values. */
  async updateProfileFieldValues(user_id: number, values: Record<string, string | null>): Promise<AdminUserDto> {
    const response = await apiClient.put<{ user: AdminUserDto }>(`/api/admin/users/${user_id}/profile-fields`, {
      values,
    });
    return response.user;
  },
};
