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
  /** Disabled or deleted, so the account can no longer sign in. */
  is_deactivated?: boolean;
  /** When the account was deleted, null while it exists. Deleted accounts are kept and can be restored. */
  deleted_at?: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles: AdminUserRoleDto[];
  department: AdminUserDepartmentDto | null;
  job_title?: string | null;
  /** Newest session activity, only on the Administration list. Null when the person never signed in. */
  last_active_at?: string | null;
  /** Custom profile field values keyed by field id, see `profile-fields.ts`. */
  profile_fields?: Record<string, string | null>;
};

export type AdminUsersPage = {
  data: AdminUserDto[];
  current_page: number;
  last_page: number;
  total: number;
};

/** Columns the `/api/admin/users` list can be sorted by, mirroring `AdminUserQuery::ALLOWED_SORT_FIELDS`. */
export type AdminUsersSortField = "name" | "email" | "role" | "department" | "status" | "created_at" | "last_active";

export type AdminUsersSortDirection = "asc" | "desc";

export type AdminUsersQuery = {
  search?: string;
  /** Restricts the list to staff-tier accounts or client-only accounts. */
  type?: "staff" | "client";
  page?: number;
  per_page?: number;
  /** `"unassigned"` for users with no department, or a specific department id. */
  department?: "unassigned" | number;
  role?: PlatformRoleName;
  account_status?: "active" | "disabled" | "deleted";
  sort_field?: AdminUsersSortField;
  sort_direction?: AdminUsersSortDirection;
  /**
   * Column filter parameters already serialized by the filter bar (`role=staff,client`,
   * `last_active_from=...`, `fields[3][in]=ny`, ...), see `AdminUserQuery` in the API.
   */
  filter_params?: Record<string, string>;
  /** Restricts an export to the selected rows. */
  ids?: number[];
};

export type BulkUserAction = "set_department" | "set_role" | "deactivate" | "reactivate";

export type BulkUserActionPayload = {
  user_ids: number[];
  action: BulkUserAction;
  department_id?: number | null;
  role?: PlatformRoleName;
};

export type BulkUserActionResult = {
  message: string;
  updated_count: number;
  skipped_count: number;
  updated_ids: number[];
};

export type AdminUserSessionSummaryDto = {
  id: number;
  device: string;
  device_type: "desktop" | "mobile" | "tablet";
  ip_address: string | null;
  last_used_at: string;
  created_at: string;
};

export type AdminUserActivityDto = {
  id: number;
  event: string;
  description: string;
  created_at: string;
  actor: { id: number; full_name: string } | null;
};

/** `GET /api/admin/users/{id}/details`, everything the user details drawer shows. */
export type AdminUserDetailsDto = {
  user: AdminUserDto;
  teams: { id: number; name: string; is_team_owner: boolean }[];
  workspaces: { id: number; name: string; role: string | null }[];
  owned_boards: {
    total: number;
    data: { id: number; label: string; workspace: { id: number; name: string } | null; is_archived: boolean }[];
  };
  sessions: AdminUserSessionSummaryDto[];
  stats: { items_created: number; updates_posted: number; boards_owned: number };
  recent_activity: AdminUserActivityDto[];
};

export type UpdateAdminUserPayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  department_id?: number | null;
};

export type SetUserPasswordPayload = {
  password: string;
  password_confirmation: string;
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
