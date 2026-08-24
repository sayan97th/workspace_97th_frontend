/**
 * API types for the Administration Users section, mirroring `UserWithRolesResource` and
 * the platform's real RBAC roles (as opposed to per-workspace membership roles).
 */

export type PlatformRoleName = "super_admin" | "admin" | "staff" | "client";

export type AdminUserRoleDto = {
  id: number;
  name: PlatformRoleName;
  display_name: string;
};

export type AdminUserDepartmentDto = {
  id: number;
  name: string;
};

export type AdminUserDto = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles: AdminUserRoleDto[];
  department: AdminUserDepartmentDto | null;
};

export type AdminUsersPage = {
  data: AdminUserDto[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AdminUsersQuery = {
  search?: string;
  page?: number;
  per_page?: number;
  /** `"unassigned"` for users with no department, or a specific department id. */
  department?: "unassigned" | number;
};

export type UpdateAdminUserPayload = {
  phone?: string | null;
  department_id?: number | null;
};

export type InviteUserPayload = {
  email: string;
  role: PlatformRoleName;
  department_id?: number | null;
  message?: string;
};

export type StaffInvitationDto = {
  id: number;
  email: string;
  role: PlatformRoleName;
  department_id: number | null;
  expires_at: string | null;
  created_at: string;
};
