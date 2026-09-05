import { apiClient, setToken } from "@/lib/api-client";
import type { InviteRoleId } from "@/data/invite-members-data";
import type { AuthResponse } from "@/types/auth";
import type {
  AcceptInvitationPayload,
  InvitationPreview,
  InviteWorkspaceMembersResult,
  WorkspaceInvitationCandidate,
  WorkspaceInvitationListQuery,
  WorkspaceInvitationsPage,
  WorkspaceMembershipRole,
} from "@/types/invitation";

/** Builds the `GET /api/workspaces/{slug}/invitations` query string. */
function buildInvitationListQuery(query?: WorkspaceInvitationListQuery): string {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.role) params.set("role", query.role);
  if (query?.sort_field) params.set("sort_field", query.sort_field);
  if (query?.sort_direction) params.set("sort_direction", query.sort_direction);
  if (query?.date_from) params.set("date_from", query.date_from);
  if (query?.date_to) params.set("date_to", query.date_to);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

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

  /** GET /api/workspaces/{slug}/invitations — the "Sent invitations" view's table, searched/filtered/sorted/paginated. */
  async listInvitations(
    workspace_slug: string,
    query?: WorkspaceInvitationListQuery
  ): Promise<WorkspaceInvitationsPage> {
    return apiClient.get<WorkspaceInvitationsPage>(
      `/api/workspaces/${workspace_slug}/invitations${buildInvitationListQuery(query)}`
    );
  },

  /**
   * POST /api/workspaces/{slug}/invitations — sends a single invitation with
   * a real membership role directly (no {@link InviteRoleId} mapping), for
   * the "Sent invitations" view's own "Invite Member" form.
   */
  async sendInvitation(
    workspace_slug: string,
    email: string,
    role: WorkspaceMembershipRole
  ): Promise<InviteWorkspaceMembersResult> {
    return apiClient.post<InviteWorkspaceMembersResult>(
      `/api/workspaces/${workspace_slug}/invitations`,
      { emails: [email], role }
    );
  },

  /**
   * GET /api/workspaces/{slug}/invitations/available-users — the "pool of
   * users" autocomplete for the invite-member form: platform users matching
   * `search` who aren't already a member of this workspace.
   */
  async searchAvailableUsers(workspace_slug: string, search: string): Promise<WorkspaceInvitationCandidate[]> {
    const response = await apiClient.get<{ data: WorkspaceInvitationCandidate[] }>(
      `/api/workspaces/${workspace_slug}/invitations/available-users?search=${encodeURIComponent(search)}`
    );
    return response.data;
  },

  /** DELETE /api/workspaces/{slug}/invitations/{id} — revokes a still-pending invitation. */
  async revokeInvitation(workspace_slug: string, invitation_id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `/api/workspaces/${workspace_slug}/invitations/${invitation_id}`
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
