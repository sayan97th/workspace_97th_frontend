/** API types for the Administration Audit log section, mirroring `AuditLogResource`. */

export type AuditLogActorDto = {
  id: number;
  full_name: string;
};

export type AuditLogEntryDto = {
  id: number;
  event: string;
  description: string;
  ip_address: string | null;
  device: string;
  created_at: string;
  actor: AuditLogActorDto | null;
};

export type AuditLogPage = {
  data: AuditLogEntryDto[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AuditLogQuery = {
  search?: string;
  event?: string;
  page?: number;
  per_page?: number;
};

/** Every event this app currently instruments via `AuditLogger::log()` on the backend. */
export const AUDIT_LOG_EVENTS = [
  "role.assigned",
  "role.revoked",
  "user.deactivated",
  "user.reactivated",
  "department.created",
  "department.updated",
  "department.deleted",
  "board_ownership.reassigned",
  "board_ownership.orphan_assigned",
  "authentication_settings.updated",
  "authentication_settings.scim_token_rotated",
  "panic_mode.activated",
  "panic_mode.deactivated",
  "session.revoked",
  "session.revoked_all",
  "session.revoked_user",
  "user.invited",
  "user.invitation_resent",
  "user.invitation_canceled",
  "user.bulk_set_department",
  "user.bulk_set_role",
  "user.bulk_deactivate",
  "user.bulk_reactivate",
  "user.exported",
  "user.profile_fields_updated",
  "profile_field.created",
  "profile_field.updated",
  "profile_field.deleted",
  "content.archived",
  "content.unarchived",
  "content.reassigned",
  "content.exported",
  "account.defaults_updated",
  "account_permissions.updated",
] as const;
