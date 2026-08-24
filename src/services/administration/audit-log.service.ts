import { apiClient } from "@/lib/api-client";
import type { AuditLogPage, AuditLogQuery } from "@/types/administration/audit-log";

const buildQuery = (query?: AuditLogQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.event) params.set("event", query.event);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/audit-log` resource. */
export const auditLogService = {
  /** GET /api/admin/audit-log */
  async getAuditLog(query?: AuditLogQuery): Promise<AuditLogPage> {
    return apiClient.get<AuditLogPage>(`/api/admin/audit-log${buildQuery(query)}`);
  },
};
