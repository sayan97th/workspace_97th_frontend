/** A single selectable role in the left-hand role list (e.g. "Workspace owner"). */
export type PermissionRole = {
  id: string;
  label: string;
};

/** One toggleable permission row inside a {@link PermissionGroup} card. */
export type PermissionItem = {
  key: string;
  label: string;
  /** Shows the "ⓘ" info glyph next to the label. */
  has_info?: boolean;
  /** Shows an expand chevron next to the label (visual affordance only, matches the design). */
  has_chevron?: boolean;
};

/** A titled card of related permissions (e.g. "Boards", "Items"). */
export type PermissionGroup = {
  id: string;
  title: string;
  items: PermissionItem[];
};

/** checked/unchecked state for every permission key, keyed by role id. */
export type PermissionMatrix = Record<string, Record<string, boolean>>;

/**
 * Declarative config consumed by {@link usePermissionsManager} — the same
 * "config-in/API-out" shape used by `useBoardToolbar` and `useProfileManager`,
 * so any other role/permission-matrix view in the app (board permissions,
 * folder permissions, ...) can reuse this kit by supplying its own roles,
 * groups and defaults instead of building a new matrix UI from scratch.
 */
export type PermissionsConfig = {
  roles: PermissionRole[];
  groups: PermissionGroup[];
  defaults: PermissionMatrix;
};
