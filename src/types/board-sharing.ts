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
};
