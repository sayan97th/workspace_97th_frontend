/** API types for Administration > Users > Invitations, mirroring `AdminStaffInvitationResource`. */
import type { PlatformRoleName } from "./admin-users";

export type StaffInvitationStatus = "pending" | "expired" | "accepted";

export type AdminStaffInvitationDto = {
  id: number;
  email: string;
  role: PlatformRoleName;
  message: string | null;
  status: StaffInvitationStatus;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  department: { id: number; name: string } | null;
  inviter: { id: number; full_name: string; profile_photo_url: string | null } | null;
};

export type AdminStaffInvitationsPage = {
  data: AdminStaffInvitationDto[];
  current_page: number;
  last_page: number;
  total: number;
  counts: StaffInvitationStatusCounts;
};

/** Account wide total per status, ignoring the list filters. Feeds the summary cards. */
export type StaffInvitationStatusCounts = Record<StaffInvitationStatus | "all", number>;

/** Server side order of the list: newest/oldest by last sent, email A to Z, or soonest expiry first. */
export type StaffInvitationSort = "newest" | "oldest" | "email" | "expires";

export type AdminStaffInvitationsQuery = {
  status?: StaffInvitationStatus | "all";
  role?: PlatformRoleName;
  sort?: StaffInvitationSort;
  search?: string;
  page?: number;
  per_page?: number;
};
