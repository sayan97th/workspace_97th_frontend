import { apiClient } from "@/lib/api-client";
import type {
  AdminUserDto,
  AdminUsersPage,
  AdminUsersQuery,
  InviteUserPayload,
  PlatformRoleName,
  StaffInvitationDto,
  UpdateAdminUserPayload,
} from "@/types/administration/admin-users";

const buildQuery = (query?: AdminUsersQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  if (query?.department !== undefined) params.set("department", String(query.department));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/users` and `/api/admin/roles` resources. */
export const adminUsersService = {
  /** GET /api/admin/users */
  async getUsers(query?: AdminUsersQuery): Promise<AdminUsersPage> {
    return apiClient.get<AdminUsersPage>(`/api/admin/users${buildQuery(query)}`);
  },

  /** PATCH /api/admin/users/{id} */
  async updateUser(user_id: number, payload: UpdateAdminUserPayload): Promise<AdminUserDto> {
    const response = await apiClient.patch<{ user: AdminUserDto }>(`/api/admin/users/${user_id}`, payload);
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

  /** POST /api/admin/users/invite */
  async inviteUser(payload: InviteUserPayload): Promise<StaffInvitationDto> {
    const response = await apiClient.post<{ invitation: StaffInvitationDto }>("/api/admin/users/invite", payload);
    return response.invitation;
  },
};
