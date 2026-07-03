/**
 * Data model for the workspace switcher dropdown rendered in the sidebar header.
 * Kept separate from the component so the same lists can feed a future
 * "Browse all workspaces" screen or a top-bar switcher without duplication.
 */
export type WorkspaceSummary = {
  id: string;
  name: string;
  /** 1-2 character monogram shown inside the square badge. */
  mono: string;
  /** Badge background color (hex). Falls back to the brand red when omitted. */
  color: string;
  /** The home workspace renders the small house glyph on its badge. */
  is_home?: boolean;
};

/** Brand red — the default badge color for 97th Floor workspaces. */
export const default_workspace_color = "#e53e2e";

export const active_workspace: WorkspaceSummary = {
  id: "fulfillment",
  name: "Fulfillment",
  mono: "97",
  color: default_workspace_color,
  is_home: true,
};

export const recent_workspaces: WorkspaceSummary[] = [
  {
    id: "fulfillment",
    name: "Fulfillment",
    mono: "97",
    color: default_workspace_color,
    is_home: true,
  },
];

export const my_workspaces: WorkspaceSummary[] = [
  {
    id: "fulfillment",
    name: "Fulfillment",
    mono: "97",
    color: default_workspace_color,
    is_home: true,
  },
];
