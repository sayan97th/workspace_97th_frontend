/**
 * API types for board email invitations, granting view-only access to a
 * single board independent of full workspace membership. Mirror the Laravel
 * `BoardInvitationController` payloads (see `src/types/invitation.ts` for
 * the analogous, workspace-scoped shapes).
 */

/** One row of a board's "who has access" roster shown in the invite dialog. */
export type BoardAccessEntryKind = "owner" | "collaborator" | "invitation";

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
  status: "accepted" | "pending";
  /** False for board owners, who can't be removed from this dialog. */
  removable: boolean;
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
