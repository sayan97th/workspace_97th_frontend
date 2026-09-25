/** API types for the Administration Sessions section, mirroring `AdminUserSessionResource`. */

export type AdminSessionUserDto = {
  id: number;
  full_name: string;
  email?: string;
  profile_photo_url: string | null;
};

export type AdminSessionDto = {
  id: number;
  device: string;
  device_type: "desktop" | "mobile" | "tablet";
  /** When the person signed in on this device. */
  created_at: string;
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

export type AdminSessionsSortField = "last_used_at" | "created_at" | "user";

export type AdminSessionsQuery = {
  search?: string;
  page?: number;
  per_page?: number;
  sort_field?: AdminSessionsSortField;
  sort_direction?: "asc" | "desc";
  /** Device type, browser and last used filters already serialized by the filter bar. */
  filter_params?: Record<string, string>;
};
