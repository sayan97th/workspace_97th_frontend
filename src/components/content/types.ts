/**
 * Types for the reusable content table/toolbar kit. Field names are
 * snake_case to match the project's data conventions.
 */

/** Creator directory key — a user id, stringified. */
export type CreatorKey = string;

export type Creator = {
  initials: string;
  name: string;
  /** Avatar gradient stops (rendered as an inline linear-gradient), used when there's no `photo_url`. */
  gradient_from: string;
  gradient_to: string;
  /** Real uploaded profile photo — takes precedence over the initials gradient when present. */
  photo_url?: string | null;
};

export type AssetType = "board" | "doc" | "dashboard" | "workflow";

/** A single asset row in a content table. */
export type ContentAsset = {
  id: string;
  name: string;
  type: AssetType;
  creator: CreatorKey;
  created_date: string;
  modified_date: string;
  folder: string;
  sub_folder?: string | null;
  is_favorite?: boolean;
  is_locked?: boolean;
};
