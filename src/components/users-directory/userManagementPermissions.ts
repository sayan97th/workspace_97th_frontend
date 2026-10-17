import type { AdminUserDto, PlatformRoleName } from "@/types/administration/admin-users";

/**
 * Roles allowed into Manage users (`/users` and `/users/{id}/edit`), mirroring the API's
 * `role:super_admin,admin` gate on every account change. The super admin is the account owner,
 * the platform has no separate account level "owner" role.
 */
export const USER_MANAGER_ROLES: PlatformRoleName[] = ["super_admin", "admin"];

/** Accounts a plain admin may not change, mirroring `AdminUserQuery::STAFF_ROLES`. */
export const STAFF_TIER_ROLES: PlatformRoleName[] = ["super_admin", "admin", "staff"];

export const ACCESS_DENIED_TITLE = "You don't have permission to manage users";

export const ACCESS_DENIED_DETAIL =
  "Only the account owner, super admins and admins can view and change user accounts. Ask one of them if you need access.";

/** Why a row is read only for a plain admin, shown in its lock tooltip. */
export const STAFF_TIER_LOCKED_HINT = "Only a super admin can change staff and admin accounts.";

/**
 * Client side mirror of `UserManagementGate::canManage()`: a super admin may change anyone, a
 * plain admin only client tier accounts. Nobody changes their own account from here, that is
 * what My Profile is for. The API re-checks all of it.
 */
export const canManageAccount = (row: AdminUserDto, actor_id: number | null, is_super_admin: boolean): boolean => {
  if (actor_id !== null && row.id === actor_id) return false;
  if (is_super_admin) return true;
  return !row.roles.some((role) => STAFF_TIER_ROLES.includes(role.name));
};
