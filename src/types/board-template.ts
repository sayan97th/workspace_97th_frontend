/** API types for the Template center, mirroring `BoardTemplateController::index()`. */

export type BoardTemplateCategory = { key: string; label: string };

export type BoardTemplatePreview = {
  views: { label: string; view_type: string }[];
  columns: { label: string; type: string }[];
  groups: { name: string; color: string | null; item_names: string[]; item_count: number }[];
  item_count: number;
};

export type BoardTemplateDto = {
  /** `builtin:{key}` or `custom:{id}`. */
  id: string;
  kind: "builtin" | "custom";
  name: string;
  description: string | null;
  category: string;
  color: string | null;
  includes_items: boolean;
  use_count: number;
  creator: { id: number; full_name: string } | null;
  created_at: string | null;
  can_delete: boolean;
  preview: BoardTemplatePreview;
};
