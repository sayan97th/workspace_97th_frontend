import { apiClient, setToken } from "@/lib/api-client";
import type { InviteRoleId } from "@/data/invite-members-data";
import type { AuthResponse } from "@/types/auth";
import type {
  AcceptInvitationPayload,
  InvitationPreview,
  InviteWorkspaceMembersResult,
  WorkspaceMembershipRole,
} from "@/types/invitation";

/**
 * The invite modal's role ids (viewer/member/admin) are a product-facing
 * concept; a workspace membership row only ever holds one of three real
 * roles. "Admin" maps to "owner" — the same role the workspace creator gets
 * — since that's the role gated on rename/delete/invite elsewhere in the API
 * (see `WorkspacePermissionCatalog::invitableRoleIds()` on the backend).
 */
const INVITE_ROLE_TO_MEMBERSHIP_ROLE: Record<InviteRoleId, WorkspaceMembershipRole> = {
  viewer: "viewer",
  member: "member",
  admin: "owner",
};

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
}

/**
 * Talks to the Laravel workspace-invitation endpoints. The "send" call goes
 * through the shared {@link apiClient} like every other authenticated
 * service; the preview/accept/decline calls hit public `auth/invitations/*`
 * routes since the invitee may not have a session yet.
 */
export const invitationService = {
  /** POST /api/workspaces/{slug}/invitations — bulk-invite by email with a single role. */
  async inviteMembers(
    workspace_slug: string,
    emails: string[],
    role: InviteRoleId,
    message?: string
  ): Promise<InviteWorkspaceMembersResult> {
    return apiClient.post<InviteWorkspaceMembersResult>(
      `/api/workspaces/${workspace_slug}/invitations`,
      {
        emails,
        role: INVITE_ROLE_TO_MEMBERSHIP_ROLE[role],
        message: message || undefined,
      }
    );
  },

  /** GET /api/auth/invitations/{code} — preview before accepting/declining. */
  async previewInvitation(code: string): Promise<InvitationPreview> {
    return apiClient.get<InvitationPreview>(`/api/auth/invitations/${code}`);
  },

  /**
   * POST /api/auth/invitations/{code}/accept — creates or authenticates the
   * invitee's account, joins them to the workspace, and starts a session.
   */
  async acceptInvitation(code: string, payload: AcceptInvitationPayload): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>(
      `/api/auth/invitations/${code}/accept`,
      payload
    );
    persistSession(data);
    return data;
  },

  /** POST /api/auth/invitations/{code}/decline */
  async declineInvitation(code: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/auth/invitations/${code}/decline`);
  },
};
