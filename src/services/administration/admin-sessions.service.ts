import { apiClient } from "@/lib/api-client";
import type { AdminSessionsPage, AdminSessionsQuery } from "@/types/administration/admin-sessions";

const buildQuery = (query?: AdminSessionsQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/sessions` resource. */
export const adminSessionsService = {
  /** GET /api/admin/sessions */
  async getSessions(query?: AdminSessionsQuery): Promise<AdminSessionsPage> {
    return apiClient.get<AdminSessionsPage>(`/api/admin/sessions${buildQuery(query)}`);
  },

  /** DELETE /api/admin/sessions/{id} */
  async revokeSession(session_id: number): Promise<void> {
    await apiClient.delete(`/api/admin/sessions/${session_id}`);
  },

  /** DELETE /api/admin/sessions */
  async revokeAllSessions(): Promise<number> {
    const response = await apiClient.delete<{ revoked_count: number }>("/api/admin/sessions");
    return response.revoked_count;
  },
};
