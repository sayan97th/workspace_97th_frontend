import { apiClient, persistSession } from "@/lib/api-client";
import type { AuthResponse } from "@/types/auth";
import type { AcceptStaffInvitationPayload, StaffInvitationPreview } from "@/types/staff-invitation";

/** Talks to the public (unauthenticated) `/api/auth/staff-invitations` endpoints. */
export const staffInvitationService = {
  /** GET /api/auth/staff-invitations/{code} */
  async previewInvitation(code: string): Promise<StaffInvitationPreview> {
    return apiClient.get<StaffInvitationPreview>(`/api/auth/staff-invitations/${code}`);
  },

  /** POST /api/auth/staff-invitations/{code}/accept */
  async acceptInvitation(code: string, payload: AcceptStaffInvitationPayload): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>(`/api/auth/staff-invitations/${code}/accept`, payload);
    persistSession(data);
    return data;
  },
};
