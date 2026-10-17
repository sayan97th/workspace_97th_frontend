"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  INVITATION_MANAGER_ROLES,
  InvitationStatCards,
  InvitationsFilterBar,
  InvitationsPager,
  InvitationsTable,
  SendInvitationModal,
  canManageWorkspaceInvitations,
  useInvitations,
  INVITATIONS_PER_PAGE,
} from "@/components/invitations";
import type { InvitationStatFilter } from "@/components/invitations";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { AlertCircleIcon, ChevronLeftIcon, PlusIcon } from "@/icons/workspace-icons";
import type { WorkspaceInvitation } from "@/types/invitation";

/**
 * "Sent invitations", a standalone page listing every invitation ever sent for a workspace:
 * summary cards that double as the status filter, server side search, role filter, sorting,
 * an "invited at" date range, revoking a pending invitation and sending a new one.
 *
 * Which workspace: an explicit `?workspace={slug}` query param (used by links from a specific
 * workspace's own views, e.g. Manage Workspace's Collaborators tab) takes priority; otherwise
 * it falls back to the top bar's active workspace, matching where `InviteMembersModal`'s own
 * "View sent invitations" link sends the user.
 *
 * Gated to a privileged global role (super_admin/admin) or that workspace's own owner,
 * matching the Laravel `WorkspaceInvitationController`'s own authorization, so anyone else
 * sees a permission message instead of a failed fetch.
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
  const can_manage_invitations = canManageWorkspaceInvitations(
    hasAnyRole(...INVITATION_MANAGER_ROLES),
    target_workspace
  );

  const invitations = useInvitations(!is_workspaces_loading && can_manage_invitations ? workspace_slug : undefined);
  const [is_invite_modal_open, setIsInviteModalOpen] = useState(false);
  const [pending_revoke, setPendingRevoke] = useState<WorkspaceInvitation | null>(null);

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

  const active_stat: InvitationStatFilter = invitations.status_filter || "all";
  const list_error = invitations.error ?? invitations.revoke_error;

  const confirmRevoke = async () => {
    if (!pending_revoke) return;
    const invitation_id = pending_revoke.id;
    setPendingRevoke(null);
    await invitations.revokeInvitation(invitation_id);
  };

  return (
    <div className="invitations-theme inv-page">
      <div className="inv-page-inner">
        <button type="button" onClick={() => router.back()} className="inv-back-link">
          <ChevronLeftIcon size={14} />
          Back
        </button>

        <header className="inv-page-header">
          <div className="min-w-0">
            {target_workspace ? (
              <span className="inv-workspace-chip">
                <span className="inv-workspace-mono" style={{ background: target_workspace.color }} aria-hidden>
                  {target_workspace.mono}
                </span>
                {target_workspace.name}
              </span>
            ) : null}
            <h1 className="font-heading text-page-title text-[var(--inv-text)]">Sent invitations</h1>
            <p className="inv-page-subtitle">
              Everyone invited to {target_workspace?.name ?? "this workspace"}, whether they joined, are still pending
              or let the invitation expire.
            </p>
          </div>

          <button type="button" onClick={() => setIsInviteModalOpen(true)} className="inv-button inv-button-primary">
            <PlusIcon size={16} />
            Invite member
          </button>
        </header>

        <InvitationStatCards
          counts={invitations.counts}
          active={active_stat}
          onSelect={(filter) => invitations.setStatusFilter(filter === "all" ? "" : filter)}
        />

        {list_error ? (
          <div role="alert" className="inv-notice" data-tone="danger">
            <AlertCircleIcon size={16} />
            <span>{list_error}</span>
          </div>
        ) : null}

        <section className="inv-card" aria-label="Invitations list">
          <InvitationsFilterBar
            search_value={invitations.search_value}
            on_search_change={invitations.setSearchValue}
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

          <InvitationsTable
            invitations={invitations.invitations}
            is_loading={invitations.is_loading}
            sort_field={invitations.sort_field}
            sort_direction={invitations.sort_direction}
            onSort={invitations.toggleColumnSort}
            onRevoke={setPendingRevoke}
            revoking_id={invitations.revoking_id}
            has_active_filters={invitations.has_active_filters}
            onClearFilters={invitations.clearAll}
            onInvite={() => setIsInviteModalOpen(true)}
          />

          {invitations.meta ? (
            <InvitationsPager
              page={invitations.meta.current_page}
              last_page={invitations.meta.last_page}
              total={invitations.meta.total}
              per_page={INVITATIONS_PER_PAGE}
              onPageChange={invitations.setPage}
            />
          ) : null}
        </section>
      </div>

      <SendInvitationModal
        is_open={is_invite_modal_open}
        onClose={() => setIsInviteModalOpen(false)}
        workspace_slug={workspace_slug}
        onSent={invitations.reload}
      />

      <ConfirmActionModal
        is_open={pending_revoke !== null}
        title="Revoke invitation"
        description={`The invitation link sent to ${pending_revoke?.email ?? ""} will stop working right away. You can always invite them again.`}
        confirm_label="Revoke invitation"
        cancel_label="Keep it"
        variant="danger"
        onConfirm={confirmRevoke}
        onClose={() => setPendingRevoke(null)}
      />
    </div>
  );
};

export default InvitationsView;
