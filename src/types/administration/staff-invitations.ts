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
  counts: { pending: number; expired: number };
};

export type AdminStaffInvitationsQuery = {
  status?: StaffInvitationStatus | "all";
  search?: string;
  page?: number;
  per_page?: number;
};
