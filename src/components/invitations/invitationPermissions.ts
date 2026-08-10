import type { BrowseWorkspace } from "@/data/workspace-browse-data";

/**
 * Global roles that can manage any workspace's invitations regardless of
 * their own membership in it. Mirrors the Laravel side's
 * `WorkspaceInvitationController::PRIVILEGED_GLOBAL_ROLES`.
 */
export const INVITATION_MANAGER_ROLES = ["super_admin", "admin"] as const;

/**
 * Whether the current user can view, send, or revoke a given workspace's
 * invitations: either a privileged global role, or being that workspace's
 * owner. Shared by the "Sent invitations" view and any other surface that
 * gates the invite flow (e.g. a top bar "Invite" trigger, Manage Workspace's
 * Collaborators tab).
 */
export function canManageWorkspaceInvitations(
  has_privileged_role: boolean,
  workspace?: Pick<BrowseWorkspace, "memberships">
): boolean {
  return has_privileged_role || Boolean(workspace?.memberships.includes("owner"));
}
