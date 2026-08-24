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
] as const;
