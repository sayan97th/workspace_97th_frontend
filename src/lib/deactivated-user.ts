/**
 * A deactivated account is one that can no longer sign in, either because an
 * administrator disabled it or deleted it. The backend keeps the person's name,
 * email and photo (see `User::$is_deactivated` in workspace_97th_api), so their
 * past comments and assignments still show who they were, faded, the way
 * monday.com greys out people who left the account.
 */

/** Applied to an avatar or a name to fade a deactivated person. */
export const DEACTIVATED_FADE_CLASS = "opacity-50 grayscale";

/** Short label shown next to a deactivated person's name. */
export const DEACTIVATED_LABEL = "Inactive";

/** Tooltip for a deactivated person's avatar or name. */
export const DEACTIVATED_TOOLTIP = "This account is deactivated";

/** The `title` attribute for a person's avatar: their name, plus a note when deactivated. */
export const getPersonTitle = (name: string, is_deactivated?: boolean): string =>
  is_deactivated ? `${name} (deactivated)` : name;

/** Fade classes for a deactivated person, or an empty string for everyone else. */
export const getDeactivatedClass = (is_deactivated?: boolean): string => (is_deactivated ? DEACTIVATED_FADE_CLASS : "");
