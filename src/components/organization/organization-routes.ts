/** Administration > Organization, a section of the Administration view. `/admin/organization` redirects here. */
export const ORGANIZATION_SETTINGS_PATH = "/administration?section=organization";

/** Roles that may change the organization settings, mirroring the API's `role:super_admin,admin` gate. */
export const ORGANIZATION_EDITOR_ROLES = ["super_admin", "admin"];

/** Roles that may open the section at all, staff get a read only view (the API's `/admin` floor). */
export const ORGANIZATION_VIEWER_ROLES = ["super_admin", "admin", "staff"];
