import { apiClient } from "@/lib/api-client";
import type {
  AdminStaffInvitationDto,
  AdminStaffInvitationsPage,
  AdminStaffInvitationsQuery,
} from "@/types/administration/staff-invitations";

const buildQuery = (query?: AdminStaffInvitationsQuery): string => {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.search) params.set("search", query.search);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/invitations` resource (sending lives on `adminUsersService.inviteUser`). */
export const staffInvitationsService = {
  /** GET /api/admin/invitations */
  async getInvitations(query?: AdminStaffInvitationsQuery): Promise<AdminStaffInvitationsPage> {
    return apiClient.get<AdminStaffInvitationsPage>(`/api/admin/invitations${buildQuery(query)}`);
  },

  /** POST /api/admin/invitations/{id}/resend, emails it again and restarts the 7 day expiry. */
  async resendInvitation(invitation_id: number): Promise<AdminStaffInvitationDto> {
    const response = await apiClient.post<{ invitation: AdminStaffInvitationDto }>(
      `/api/admin/invitations/${invitation_id}/resend`,
      {}
    );
    return response.invitation;
  },

  /** DELETE /api/admin/invitations/{id}, the invitation link stops working. */
  async cancelInvitation(invitation_id: number): Promise<void> {
    await apiClient.delete<void>(`/api/admin/invitations/${invitation_id}`);
  },
};
