/**
 * `/workspaces/{workspace_id}/{tab}` — one addressable URL per Manage
 * Workspace tab (`recent-boards` / `content-management` / `collaborators` /
 * `permissions`).
 *
 * Route marker only: `WorkspaceManageRouteView`, mounted once by the parent
 * `layout.tsx`, reads `tab` via `WorkspaceManageRouteContext` (which derives
 * it straight from the router) and passes it down as the already-mounted
 * `WorkspaceManage`'s active tab — so switching tabs never re-fetches or
 * remounts the workspace underneath it.
 */
export default function WorkspaceManageTabPage() {
  return null;
}
