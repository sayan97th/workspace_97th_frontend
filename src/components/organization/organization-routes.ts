/** Route of Administration > Organization. */
export const ORGANIZATION_SETTINGS_PATH = "/admin/organization";

/** Roles that may change the organization settings, mirroring the API's `role:super_admin,admin` gate. */
export const ORGANIZATION_EDITOR_ROLES = ["super_admin", "admin"];

/** Roles that may open the page at all, staff get a read only view (the API's `/admin` floor). */
export const ORGANIZATION_VIEWER_ROLES = ["super_admin", "admin", "staff"];
