/**
 * API types for workspace email invitations. Mirror the Laravel
 * `WorkspaceInvitationResource` / `WorkspaceInvitationController` payloads.
 */

/** Real workspace membership role a `workspace_user.role` row can hold — distinct from the invite modal's `InviteRoleId`, see `invitation.service.ts`. */
export type WorkspaceMembershipRole = "owner" | "member" | "viewer";

/** Where an invitation stands: still open, past its `expires_at`, or already accepted. */
export type WorkspaceInvitationStatus = "pending" | "expired" | "accepted";

/** The teammate who sent an invitation — only present when the endpoint eager-loads it. */
export type WorkspaceInvitationInviter = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

/** One invitation the API created, resent, or is listing, from `WorkspaceInvitationResource`. */
export type WorkspaceInvitation = {
  id: number;
  email: string;
  role: WorkspaceMembershipRole;
  role_label: string;
  status: WorkspaceInvitationStatus;
  message: string | null;
  /** Only present on `GET /api/workspaces/{slug}/invitations`, which eager-loads it. */
  inviter?: WorkspaceInvitationInviter;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
};

/** Pagination metadata mirroring every other server-paginated list in the app (Content tab, team rosters, …). */
export type WorkspaceInvitationsPageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/** Response for `GET /api/workspaces/{slug}/invitations`. */
export type WorkspaceInvitationsPage = {
  data: WorkspaceInvitation[];
  meta: WorkspaceInvitationsPageMeta;
};

/** Column the "Sent invitations" table can be sorted by. */
export type WorkspaceInvitationSortField = "email" | "role" | "status" | "expires_at" | "created_at";

export type SortDirection = "asc" | "desc";

/** Query params `GET /api/workspaces/{slug}/invitations` accepts. */
export type WorkspaceInvitationListQuery = {
  search?: string;
  status?: WorkspaceInvitationStatus | "";
  role?: WorkspaceMembershipRole | "";
  sort_field?: WorkspaceInvitationSortField;
  sort_direction?: SortDirection;
  /** "Invited at" (`created_at`) date range, both inclusive, `YYYY-MM-DD`. */
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
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
  message: string | null;
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

/**
 * A workspace's single reusable "invite with link" share link, from
 * `GET/PATCH /api/workspaces/{slug}/invite-link` and the regenerate action.
 * Unlike an email {@link WorkspaceInvitation}, it isn't addressed to one
 * person: anyone holding the URL can join with the role it grants, until an
 * owner disables or regenerates it.
 */
export type WorkspaceInviteLink = {
  url: string;
  role: WorkspaceMembershipRole;
  role_label: string;
  enabled: boolean;
};

/** The public preview shown before joining a workspace by link, from `GET /api/auth/workspaces/join/{code}`. */
export type WorkspaceJoinLinkPreview = {
  workspace: {
    id: number;
    name: string;
    mono: string;
    color: string;
  };
  role: WorkspaceMembershipRole;
  role_label: string;
  enabled: boolean;
};

/**
 * Payload for `POST /api/auth/workspaces/join/{code}`. The joiner isn't
 * known in advance, so, unlike {@link AcceptInvitationPayload}, this always
 * includes the email they're joining with.
 */
export type JoinWorkspaceByLinkPayload = {
  email: string;
  password: string;
  password_confirmation?: string;
  first_name?: string;
  last_name?: string;
};
