/** API types for the Administration Sessions section, mirroring `AdminUserSessionResource`. */

export type AdminSessionUserDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

export type AdminSessionDto = {
  id: number;
  device: string;
  ip_address: string | null;
  last_used_at: string;
  is_revoked: boolean;
  user: AdminSessionUserDto | null;
};

export type AdminSessionsPage = {
  data: AdminSessionDto[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AdminSessionsQuery = {
  search?: string;
  page?: number;
  per_page?: number;
};
