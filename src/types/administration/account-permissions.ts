/** API types for Administration > Security > Permissions, mirroring `AccountPermissionsController`. */

export type AccountPermissionKey =
  | "create_workspaces"
  | "create_boards"
  | "delete_boards"
  | "invite_members"
  | "export_data"
  | "use_integrations";

/** Only these tiers are configurable, admins and super admins can always do everything. */
export type AccountPermissionRole = "staff" | "client";

export type AccountPermissionDefinitionDto = {
  key: AccountPermissionKey;
  label: string;
  description: string;
};

export type AccountPermissionMatrix = Record<AccountPermissionRole, Record<AccountPermissionKey, boolean>>;

export type AccountPermissionsDto = {
  definitions: AccountPermissionDefinitionDto[];
  roles: AccountPermissionRole[];
  matrix: AccountPermissionMatrix;
};

export type UpdateAccountPermissionsPayload = {
  permissions: Partial<Record<AccountPermissionRole, Partial<Record<AccountPermissionKey, boolean>>>>;
};
