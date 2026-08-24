/**
 * API types for the Administration "Invite" flow, mirroring the Laravel
 * `StaffInvitationResource` / `Auth\StaffInvitationController` payloads. Unlike a workspace
 * invitation, a staff invitation always creates a brand-new account (an email that already
 * has one is rejected up front when the invitation is sent), so its accept flow never
 * branches on "does this account already exist".
 */
import type { PlatformRoleName } from "@/types/administration/admin-users";

export type StaffInvitationStatus = "pending" | "expired" | "accepted";

/** The public preview shown on the accept page, from `GET /api/auth/staff-invitations/{code}`. */
export type StaffInvitationPreview = {
  email: string;
  role: PlatformRoleName;
  inviter_name: string;
  message: string | null;
  status: StaffInvitationStatus;
};

/** Payload for `POST /api/auth/staff-invitations/{code}/accept`. */
export type AcceptStaffInvitationPayload = {
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
};
