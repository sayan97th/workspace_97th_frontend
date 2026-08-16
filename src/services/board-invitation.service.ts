import { apiClient, setToken } from "@/lib/api-client";
import type { AuthResponse } from "@/types/auth";
import type {
  AcceptBoardInvitationPayload,
  BoardAccessEntry,
  BoardInvitationPreview,
  InviteBoardViewersResult,
} from "@/types/board-invitation";

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
}

/**
 * Talks to the Laravel board-invitation endpoints, granting view access to a
 * single board rather than a whole workspace. The "manage" calls go through
 * the shared {@link apiClient} like every other authenticated service; the
 * preview/accept/decline calls hit public `auth/board-invitations/*` routes
 * since the invitee may not have a session yet.
 */
export const boardInvitationService = {
  /** GET /api/boards/{id}/invitations — the "Invite to this board" dialog's roster (owners, collaborators, pending invites). */
  async listAccess(board_id: number): Promise<BoardAccessEntry[]> {
    const response = await apiClient.get<{ data: BoardAccessEntry[] }>(`/api/boards/${board_id}/invitations`);
    return response.data;
  },

  /** POST /api/boards/{id}/invitations — invite one or more emails to view the board. */
  async inviteViewers(board_id: number, emails: string[], message?: string): Promise<InviteBoardViewersResult> {
    return apiClient.post<InviteBoardViewersResult>(`/api/boards/${board_id}/invitations`, {
      emails,
      message: message || undefined,
    });
  },

  /** DELETE /api/boards/{id}/invitations/{invitation_id} — revokes a still-pending invitation. */
  async revokeInvitation(board_id: number, invitation_id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/boards/${board_id}/invitations/${invitation_id}`);
  },

  /** DELETE /api/boards/{id}/collaborators/{user_id} — removes a collaborator's explicit board access. */
  async removeCollaborator(board_id: number, user_id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/boards/${board_id}/collaborators/${user_id}`);
  },

  /** GET /api/auth/board-invitations/{code} — preview before accepting/declining. */
  async previewInvitation(code: string): Promise<BoardInvitationPreview> {
    return apiClient.get<BoardInvitationPreview>(`/api/auth/board-invitations/${code}`);
  },

  /**
   * POST /api/auth/board-invitations/{code}/accept — creates or
   * authenticates the invitee's account, grants them view access to the
   * board, and starts a session.
   */
  async acceptInvitation(code: string, payload: AcceptBoardInvitationPayload): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>(`/api/auth/board-invitations/${code}/accept`, payload);
    persistSession(data);
    return data;
  },

  /** POST /api/auth/board-invitations/{code}/decline */
  async declineInvitation(code: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/auth/board-invitations/${code}/decline`);
  },
};
