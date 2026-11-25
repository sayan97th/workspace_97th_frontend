/**
 * Data model + helpers for the "Add new workspace" dialog.
 *
 * Mirrors the deterministic name -> color/initial preview from the approved
 * design so the badge shown while typing matches the badge the workspace gets
 * once created, until the user overrides it with an explicit color pick
 * and/or an uploaded avatar image.
 */
import { WORKSPACE_SWATCHES } from "@/lib/color-palette";

export type WorkspacePrivacy = "open" | "closed";

/**
 * Badge color choices offered by {@link WorkspaceColorPicker} and the
 * deterministic name -> color fallback below. A user can still enter any
 * other hex value via the picker's custom color swatch.
 */
export const workspace_create_color_palette = WORKSPACE_SWATCHES.map((swatch) => swatch.hex);

/** Badge color shown while the name field is empty. */
export const workspace_create_empty_color = "#6E7B7D";

/** Accent used by this dialog's input focus ring, radios, and primary button. */
export const workspace_create_accent_color = "#2B76E5";

export const default_new_workspace_name = "New Workspace";

export const workspace_privacy_hints: Record<WorkspacePrivacy, string> = {
  open: "Every team member in the account can join",
  closed: "Only invited members can join this workspace",
};

/**
 * Deterministic name -> palette color, matching the approved design so the
 * live avatar preview never flickers between renders for the same input.
 */
export const hashWorkspaceColor = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return workspace_create_empty_color;

  let hash = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    hash = (hash * 31 + trimmed.charCodeAt(index)) >>> 0;
  }
  return workspace_create_color_palette[hash % workspace_create_color_palette.length];
};

/** Max upload size accepted for a workspace avatar image, matching `StoreWorkspaceAvatarRequest`'s `max:5120` (5MB). */
export const workspace_avatar_max_size_bytes = 5 * 1024 * 1024;
