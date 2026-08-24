import { apiClient, setToken } from "@/lib/api-client";
import type { AuthResponse } from "@/types/auth";
import type { AcceptStaffInvitationPayload, StaffInvitationPreview } from "@/types/staff-invitation";

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
}

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
