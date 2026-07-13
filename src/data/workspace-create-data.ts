/**
 * Data model + helpers for the "Add new workspace" dialog.
 *
 * Mirrors the deterministic name -> color/initial preview from the approved
 * design so the badge shown while typing matches the badge the workspace gets
 * once created. Kept separate from the component so the same factory can be
 * reused if another entry point needs to create a workspace programmatically.
 */
import type { BrowseWorkspace } from "./workspace-browse-data";

export type WorkspacePrivacy = "open" | "closed";

/** Badge color candidates a new workspace's color is deterministically picked from. */
export const workspace_create_color_palette = [
  "#E53E2E",
  "#2B7FE0",
  "#5FBEE8",
  "#2FB56B",
  "#E9A23B",
  "#8A63D2",
  "#DB4C86",
];

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

/** Builds the workspace record submitted from the create-workspace form. */
export const buildWorkspaceFromName = (
  name: string,
  privacy: WorkspacePrivacy
): BrowseWorkspace => {
  const trimmed = name.trim();
  return {
    id: `custom_${Date.now()}`,
    name: trimmed,
    mono: trimmed[0]?.toUpperCase() ?? "W",
    color: hashWorkspaceColor(trimmed),
    is_home: false,
    product: "monday",
    role: "Owner",
    memberships: ["recent", "owner"],
    privacy,
  };
};
