/**
 * Global roles allowed onto Manage Workspace's "Permissions" tab, mirroring
 * the Laravel API's `role:super_admin,admin,staff` gate on
 * `GET|PATCH /api/workspace-permissions` (see `routes/api.php` and
 * `WorkspacePermissionController`). Everyone else can see the tab (it stays
 * visible, just rendered disabled) but may neither view nor edit the matrix.
 */
export const WORKSPACE_PERMISSIONS_MANAGER_ROLES = ["super_admin", "admin", "staff"] as const;
