/**
 * API types for board email invitations, granting view-only access to a
 * single board independent of full workspace membership. Mirror the Laravel
 * `BoardInvitationController` payloads (see `src/types/invitation.ts` for
 * the analogous, workspace-scoped shapes).
 */

/**
 * One row of a board's "who has access" roster shown in the invite dialog. `member` rows only
 * come in `workspace_access`, for people who see the board through its workspace.
 */
export type BoardAccessEntryKind = "owner" | "collaborator" | "invitation" | "member";

/** Where a roster row's access comes from: owning the board, being added to it, the workspace, or a pending invite. */
export type BoardAccessVia = "owner" | "board" | "workspace" | "invitation";

/** Where a pending invitation stands, derived server-side from its timestamps. */
export type BoardInvitationStatus = "pending" | "expired" | "accepted";

/** One person (or pending invite) with a stake in who can view the board, from `GET /api/boards/{id}/invitations`. */
export type BoardAccessEntry = {
  /** Stable React list key, e.g. "owner-12" or "invitation-7". */
  key: string;
  kind: BoardAccessEntryKind;
  /** The user id (owner/collaborator) or the invitation id (invitation). */
  id: number;
  /** Null for a pending invitation sent to someone without an account yet. */
  full_name: string | null;
  email: string;
  profile_photo_url: string | null;
  /** Shown under the name in the Share dialog, null for a pending invitation or when never set. */
  job_title?: string | null;
  status: "accepted" | "pending";
  /** False for board owners, who can't be removed from this dialog. */
  removable: boolean;
  access_via?: BoardAccessVia;
  /** Their role in the board's workspace, null when they are not a member of it. */
  workspace_role?: string | null;
  /** A workspace viewer (an accepted board invitee) or someone outside the workspace. */
  is_guest?: boolean;
  /** Pending invitations only: when it was last sent (a resend refreshes it). */
  invited_at?: string | null;
  /** Pending invitations only: when the invitation link stops working. */
  expires_at?: string | null;
  /** Pending invitations only: who sent it. */
  invited_by_name?: string | null;
};

/** People who can open the board only because they belong to its workspace. Empty for a private board. */
export type BoardWorkspaceAccess = {
  /** False for a private board, which is never visible through a workspace role. */
  applies: boolean;
  total: number;
  members: BoardAccessEntry[];
};

/** Full response of `GET /api/boards/{id}/invitations`. */
export type BoardAccessRoster = {
  data: BoardAccessEntry[];
  workspace_access?: BoardWorkspaceAccess;
};

/** One email that was NOT invited, and why. */
export type SkippedBoardInvitation = {
  email: string;
  reason: "already_has_access";
};

/** Response for `POST /api/boards/{id}/invitations`. */
export type InviteBoardViewersResult = {
  message: string;
  data: BoardAccessEntry[];
  skipped: SkippedBoardInvitation[];
};

/** Response for `POST /api/boards/{id}/collaborators`, only the people who did not have access yet. */
export type AddBoardCollaboratorsResult = {
  message: string;
  data: BoardAccessEntry[];
};

/** The public preview shown on the accept-board-invitation page, from `GET /api/auth/board-invitations/{code}`. */
export type BoardInvitationPreview = {
  email: string;
  board: {
    id: number;
    label: string;
    icon: string | null;
  };
  workspace: {
    id: number;
    name: string;
    mono: string;
    color: string;
    avatar_url?: string | null;
  };
  inviter_name: string;
  message: string | null;
  status: BoardInvitationStatus;
  /** True when the invited email already has an account — the accept form only needs a password, not a full name. */
  account_exists: boolean;
};

/** Payload for `POST /api/auth/board-invitations/{code}/accept`. A brand-new account additionally needs a name. */
export type AcceptBoardInvitationPayload = {
  password: string;
  password_confirmation?: string;
  first_name?: string;
  last_name?: string;
};

/**
 * Someone added to a board, from `GET /api/boards/{id}/members`: the board's creator, owner and
 * invited collaborators, plus the whole workspace unless the board is private. Disabled or deleted
 * accounts never appear. Only these people can be assigned in the board's People columns or
 * `@mentioned` and notified in its updates and discussion.
 */
export type BoardMember = {
  id: number;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  job_title: string | null;
};
