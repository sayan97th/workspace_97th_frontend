/**
 * API types for workspace email invitations. Mirror the Laravel
 * `WorkspaceInvitationResource` / `WorkspaceInvitationController` payloads.
 */

/** Real workspace membership role a `workspace_user.role` row can hold — distinct from the invite modal's `InviteRoleId`, see `invitation.service.ts`. */
export type WorkspaceMembershipRole = "owner" | "member" | "viewer";

/** One invitation the API created or resent, from `POST /api/workspaces/{slug}/invitations`'s `data` array. */
export type WorkspaceInvitation = {
  id: number;
  email: string;
  role: WorkspaceMembershipRole;
  role_label: string;
  expires_at: string | null;
  created_at: string | null;
};

/** One email that was NOT invited, and why. */
export type SkippedInvitation = {
  email: string;
  reason: "already_member";
};

/** Response for `POST /api/workspaces/{slug}/invitations`. */
export type InviteWorkspaceMembersResult = {
  message: string;
  data: WorkspaceInvitation[];
  skipped: SkippedInvitation[];
};

/** The public preview shown on the accept-invitation page, from `GET /api/auth/invitations/{code}`. */
export type InvitationPreview = {
  email: string;
  role: WorkspaceMembershipRole;
  role_label: string;
  workspace: {
    id: number;
    name: string;
    mono: string;
    color: string;
  };
  inviter_name: string;
  status: "pending" | "expired" | "accepted";
  /** True when the invited email already has an account — the accept form only needs a password, not a full name. */
  account_exists: boolean;
};

/** Payload for `POST /api/auth/invitations/{code}/accept`. A brand-new account additionally needs a name. */
export type AcceptInvitationPayload = {
  password: string;
  password_confirmation?: string;
  first_name?: string;
  last_name?: string;
};
