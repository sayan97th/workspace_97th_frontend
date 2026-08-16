import { apiClient, setToken } from "@/lib/api-client";
import type { AuthResponse } from "@/types/auth";
import type {
  JoinWorkspaceByLinkPayload,
  WorkspaceInviteLink,
  WorkspaceJoinLinkPreview,
  WorkspaceMembershipRole,
} from "@/types/invitation";

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
}

/**
 * Talks to the Laravel "invite with link" endpoints: managing a workspace's
 * own shareable link goes through the authenticated `apiClient`, like every
 * other workspace-management call; the public preview/join calls hit
 * `auth/workspaces/join/*` since whoever holds the link may not have a
 * session yet.
 */
export const workspaceInviteLinkService = {
  /** GET /api/workspaces/{slug}/invite-link */
  async getInviteLink(workspace_slug: string): Promise<WorkspaceInviteLink> {
    return apiClient.get<WorkspaceInviteLink>(`/api/workspaces/${workspace_slug}/invite-link`);
  },

  /** PATCH /api/workspaces/{slug}/invite-link, toggles it on/off and/or changes the granted role. */
  async updateInviteLink(
    workspace_slug: string,
    payload: { enabled?: boolean; role?: WorkspaceMembershipRole }
  ): Promise<WorkspaceInviteLink> {
    return apiClient.patch<WorkspaceInviteLink>(`/api/workspaces/${workspace_slug}/invite-link`, payload);
  },

  /** POST /api/workspaces/{slug}/invite-link/regenerate, rotates the code, invalidating the old link. */
  async regenerateInviteLink(workspace_slug: string): Promise<WorkspaceInviteLink> {
    return apiClient.post<WorkspaceInviteLink>(`/api/workspaces/${workspace_slug}/invite-link/regenerate`);
  },

  /** GET /api/auth/workspaces/join/{code}, preview before joining. */
  async previewJoinLink(code: string): Promise<WorkspaceJoinLinkPreview> {
    return apiClient.get<WorkspaceJoinLinkPreview>(`/api/auth/workspaces/join/${code}`);
  },

  /**
   * POST /api/auth/workspaces/join/{code}, creates or authenticates the
   * joiner's account, attaches them to the workspace, and starts a session.
   */
  async joinByLink(code: string, payload: JoinWorkspaceByLinkPayload): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>(`/api/auth/workspaces/join/${code}`, payload);
    persistSession(data);
    return data;
  },
};
