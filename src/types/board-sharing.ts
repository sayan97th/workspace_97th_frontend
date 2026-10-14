import type { RatingIcon } from "@/components/board/table/types";

/** A board view's public "Share view" link, see `BoardViewShareLinkController` on the API. */
export type BoardViewShareLinkDto = {
  token: string;
  is_enabled: boolean;
  has_password: boolean;
  last_accessed_at: string | null;
  created_at: string | null;
};

/** One column of a publicly shared view. Option lists come along for Status, Label and Dropdown columns. */
export type SharedViewColumnDto = {
  id: number;
  label: string;
  type: string;
  width: number;
  options: { id: string; label: string; color: string }[];
  /** Rating columns only: the scale and icon, see `ColumnDef.rating_max` and `ColumnDef.rating_icon`. */
  rating_max?: number | null;
  rating_icon?: RatingIcon | null;
};

/** `POST /api/public/views/{token}`, the read only payload of a shared view. */
export type SharedViewDto = {
  board: { label: string };
  view: { label: string; view_type: string };
  columns: SharedViewColumnDto[];
  groups: { id: number; name: string; color: string }[];
  items: { id: number; group_id: number; name: string; subitem_count: number; values: Record<string, unknown> }[];
  /** Display names for everyone a People column references, keyed by user id. */
  people: Record<string, { name: string }>;
  is_truncated: boolean;
  /** A shared Doc tab's body and creator row (its columns, groups and items are empty). Absent for item views. */
  doc?: SharedViewDocDto | null;
};

export type SharedViewDocDto = {
  content: string | null;
  creator: { full_name: string; profile_photo_url: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
};
