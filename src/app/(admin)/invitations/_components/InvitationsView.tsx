"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  INVITATION_MANAGER_ROLES,
  InvitationsFilterBar,
  InvitationsTable,
  SendInvitationModal,
  canManageWorkspaceInvitations,
  useInvitations,
} from "@/components/invitations";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { ChevronRightIcon, PlusIcon } from "@/icons/workspace-icons";

/**
 * "Sent invitations" — a standalone page (not a modal) listing every
 * invitation ever sent for a workspace: server-side search, single-select
 * status/role filters, column sorting, an "invited at" date range, revoking a
 * pending invitation, and sending a new one — ported structurally from
 * `base_portal`'s `AdminInvitationsContent` reference and restyled onto this
 * app's `shell-*` design tokens.
 *
 * Which workspace: an explicit `?workspace={slug}` query param (used by links
 * from a specific workspace's own views, e.g. Manage Workspace's Collaborators
 * tab) takes priority; otherwise falls back to the top bar's "active"
 * workspace, matching where `InviteMembersModal`'s own "View sent
 * invitations" link sends the user.
 *
 * Gated to a privileged global role (super_admin/admin) or that workspace's
 * own owner, matching the Laravel `WorkspaceInvitationController`'s own
 * authorization — anyone else sees a permission message instead of a failed
 * fetch.
 */
const InvitationsView: React.FC = () => {
  const router = useRouter();
  const search_params = useSearchParams();
  const workspace_param = search_params.get("workspace") ?? undefined;
  const { workspaces, active_workspace, active_workspace_slug, is_loading: is_workspaces_loading } = useWorkspaces();
  const { hasAnyRole } = useAuth();

  const target_workspace = workspace_param
    ? workspaces.find((workspace) => workspace.id === workspace_param)
    : active_workspace;

  const workspace_slug = workspace_param ?? active_workspace_slug;
  const workspace_name = target_workspace?.name;
  const can_manage_invitations = canManageWorkspaceInvitations(
    hasAnyRole(...INVITATION_MANAGER_ROLES),
    target_workspace
  );

  const invitations = useInvitations(!is_workspaces_loading && can_manage_invitations ? workspace_slug : undefined);
  const [is_invite_modal_open, setIsInviteModalOpen] = useState(false);

  if (is_workspaces_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!workspace_slug) {
    return <CenteredMessage title="No workspace selected" detail="Select a workspace to see its sent invitations." />;
  }

  if (!can_manage_invitations) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only the workspace owner or an administrator can view and manage sent invitations."
      />
    );
  }

  return (
    <div className="min-h-full bg-shell-bg">
      <div className="mx-auto max-w-[1120px] px-8 py-7">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
        >
          <ChevronRightIcon size={11} className="rotate-180" />
          Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-shell-text">Sent invitations</h1>
            <p className="mt-1 text-sm text-shell-text-muted">
              Invite new teammates to {workspace_name ?? "this workspace"}. See every invitation that's active,
              expired, or accepted.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            <PlusIcon size={16} />
            Invite Member
          </button>
        </div>

        <div className="mt-6">
          <InvitationsFilterBar
            search_value={invitations.search_value}
            on_search_change={invitations.setSearchValue}
            status_filter={invitations.status_filter}
            on_status_change={invitations.setStatusFilter}
            role_filter={invitations.role_filter}
            on_role_change={invitations.setRoleFilter}
            sort_field={invitations.sort_field}
            sort_direction={invitations.sort_direction}
            on_sort_change={invitations.setSort}
            date_from={invitations.date_from}
            date_to={invitations.date_to}
            on_date_range_change={invitations.setDateRange}
            total={invitations.meta?.total ?? 0}
            is_loading={invitations.is_loading}
            has_active_filters={invitations.has_active_filters}
            on_clear_all={invitations.clearAll}
          />
        </div>

        {(invitations.error || invitations.revoke_error) && (
          <div className="mt-4 rounded-lg bg-error-500/10 p-4 text-sm text-error-400">
            {invitations.error ?? invitations.revoke_error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-shell-border bg-shell-panel">
          <InvitationsTable
            invitations={invitations.invitations}
            is_loading={invitations.is_loading}
            sort_field={invitations.sort_field}
            sort_direction={invitations.sort_direction}
            onSort={invitations.toggleColumnSort}
            onRevoke={invitations.revokeInvitation}
          />

          {!invitations.is_loading && invitations.meta && invitations.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-shell-border px-6 py-3">
              <p className="text-xs text-shell-text-muted">
                Page {invitations.meta.current_page} of {invitations.meta.last_page} &middot; {invitations.meta.total}{" "}
                total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => invitations.setPage(Math.max(1, invitations.page - 1))}
                  disabled={invitations.page === 1}
                  className="rounded-lg border border-shell-border-strong px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => invitations.setPage(Math.min(invitations.meta!.last_page, invitations.page + 1))}
                  disabled={invitations.page === invitations.meta.last_page}
                  className="rounded-lg border border-shell-border-strong px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SendInvitationModal
        is_open={is_invite_modal_open}
        onClose={() => setIsInviteModalOpen(false)}
        workspace_slug={workspace_slug}
        onSent={invitations.reload}
      />
    </div>
  );
};

export default InvitationsView;
