"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner } from "@/app/(admin)/boards/_components/BoardRouteStates";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import InviteUserModal from "@/components/administration/InviteUserModal";
import { useTeamInvite } from "@/components/teams/useTeamInvite";
import { AlertCircleIcon, ChevronLeftIcon, CloseIcon, PlusIcon, UploadIcon } from "@/icons/workspace-icons";
import "@/components/invitations/invitations.scss";
import "./users-directory.scss";
import UsersAccessDenied from "./UsersAccessDenied";
import UserStatCards, { type UserStatFilter } from "./UserStatCards";
import UsersDirectoryToolbar from "./UsersDirectoryToolbar";
import UsersDirectoryTable from "./UsersDirectoryTable";
import UsersDirectoryFooter from "./UsersDirectoryFooter";
import { PER_PAGE_OPTIONS, useUsersDirectory } from "./useUsersDirectory";
import { USER_MANAGER_ROLES } from "./userManagementPermissions";

/**
 * Manage users (`/users`): every account on the site in the monday administration look.
 * Summary cards that double as the account status filter, search, role and department
 * filters, sortable columns, and per row actions (edit, change password, impersonate,
 * disable or enable, delete or restore) behind confirmation dialogs.
 *
 * Only super admins and admins get in, the same gate the API puts on every account change.
 * Anyone else sees a permission message instead of the list.
 */
const UsersDirectoryView: React.FC = () => {
  const router = useRouter();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const directory = useUsersDirectory();
  const invite = useTeamInvite();

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!hasAnyRole(...USER_MANAGER_ROLES) || directory.is_forbidden) {
    return <UsersAccessDenied />;
  }

  const active_stat: UserStatFilter = directory.status_filter ?? "all";

  return (
    <div className="invitations-theme inv-page">
      <div className="inv-page-inner">
        <button type="button" onClick={() => router.back()} className="inv-back-link">
          <ChevronLeftIcon size={14} />
          Back
        </button>

        <header className="inv-page-header">
          <div className="min-w-0">
            <h1 className="font-heading text-page-title text-[var(--inv-text)]">Manage users</h1>
            <p className="inv-page-subtitle">
              Everyone with an account on this site. Edit their details, reset a password, or disable, delete and
              restore an account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PortalTooltip content="Download the users that match the current filters as a CSV file">
              <button
                type="button"
                onClick={() => void directory.exportUsers()}
                disabled={directory.is_exporting}
                className="inv-button inv-button-secondary"
              >
                {directory.is_exporting ? <span className="inv-spinner" aria-hidden /> : <UploadIcon size={16} />}
                Export CSV
              </button>
            </PortalTooltip>
            <button type="button" onClick={invite.openInvite} className="inv-button inv-button-primary">
              <PlusIcon size={16} />
              Invite user
            </button>
          </div>
        </header>

        <UserStatCards
          counts={directory.status_counts}
          active={active_stat}
          onSelect={(filter) => directory.setStatusFilter(filter === "all" ? null : filter)}
        />

        {directory.error ? (
          <div role="alert" className="inv-notice" data-tone="danger">
            <AlertCircleIcon size={16} />
            <span>{directory.error}</span>
            <PortalTooltip content="Dismiss">
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => directory.clearError()}
                className="inv-notice-close"
              >
                <CloseIcon size={12} />
              </button>
            </PortalTooltip>
          </div>
        ) : null}

        <section className="inv-card" aria-label="Users list">
          <UsersDirectoryToolbar
            search_query={directory.search_query}
            onSearchChange={directory.setSearchQuery}
            role_filter={directory.role_filter}
            onRoleChange={directory.setRoleFilter}
            department_filter={directory.department_filter}
            onDepartmentChange={directory.setDepartmentFilter}
            department_rows={directory.department_rows}
            total={directory.user_total}
            is_loading={directory.is_loading}
            has_active_filters={directory.has_active_filters}
            onClearFilters={directory.clearFilters}
          />

          <UsersDirectoryTable
            user_rows={directory.user_rows}
            is_loading={directory.is_loading}
            sort_field={directory.sort_field}
            sort_direction={directory.sort_direction}
            onSort={directory.toggleSort}
            current_user_id={directory.current_user_id}
            canManageRow={directory.canManageRow}
            onToggleActive={directory.requestToggleActive}
            onDelete={directory.requestDelete}
            onRestore={directory.requestRestore}
            canImpersonate={directory.canImpersonate}
            onImpersonate={directory.requestImpersonate}
            has_active_filters={directory.has_active_filters}
            onClearFilters={directory.clearFilters}
          />

          {directory.user_total > 0 ? (
            <UsersDirectoryFooter
              current_page={directory.page}
              last_page={directory.last_page}
              total={directory.user_total}
              per_page={directory.per_page}
              per_page_options={PER_PAGE_OPTIONS}
              onPerPageChange={directory.setPerPage}
              onPrevious={() => directory.setPage(directory.page - 1)}
              onNext={() => directory.setPage(directory.page + 1)}
            />
          ) : null}
        </section>
      </div>

      <InviteUserModal users={invite} />

      <ConfirmActionModal
        is_open={directory.user_pending_toggle !== null}
        title={directory.user_pending_toggle?.is_active ? "Disable account" : "Enable account"}
        description={
          directory.user_pending_toggle?.is_active ? (
            <>
              &quot;{directory.user_pending_toggle?.full_name}&quot; will not be able to sign in until you enable the
              account again. Their data, boards and history are kept as they are.
            </>
          ) : (
            <>&quot;{directory.user_pending_toggle?.full_name}&quot; will be able to sign in again right away.</>
          )
        }
        confirm_label={directory.user_pending_toggle?.is_active ? "Disable account" : "Enable account"}
        variant={directory.user_pending_toggle?.is_active ? "warning" : "neutral"}
        risk_items={
          directory.user_pending_toggle?.is_active
            ? [
                "Sessions they already have open stop working too.",
                "They see a message that their account is disabled when they try to sign in.",
              ]
            : undefined
        }
        onConfirm={directory.confirmToggleActive}
        onClose={directory.cancelToggleActive}
      />

      <ConfirmActionModal
        is_open={directory.user_pending_delete !== null}
        title="Delete user"
        description={
          <>
            This will delete &quot;{directory.user_pending_delete?.full_name}&quot;&apos;s account. Their name, email
            and photo are kept, so their past comments and assignments still show who they were, faded, and you can
            restore the account later.
          </>
        }
        confirm_label="Delete user"
        variant="danger"
        risk_items={[
          "The account will lose access immediately.",
          "They will no longer appear in people pickers or mentions.",
          "You can restore the account from the Deleted card.",
        ]}
        onConfirm={directory.confirmDelete}
        onClose={directory.cancelDelete}
      />

      <ConfirmActionModal
        is_open={directory.user_pending_restore !== null}
        title="Restore user"
        description={
          <>
            &quot;{directory.user_pending_restore?.full_name}&quot; will get their account back exactly as it was, with
            the same roles, workspaces and history.
          </>
        }
        confirm_label="Restore account"
        variant="neutral"
        onConfirm={directory.confirmRestore}
        onClose={directory.cancelRestore}
      />

      <ConfirmActionModal
        is_open={directory.user_pending_impersonate !== null}
        title="Impersonate user"
        description={
          <>
            You are about to sign in as &quot;{directory.user_pending_impersonate?.full_name}&quot; to see the site
            exactly as they do.
          </>
        }
        confirm_label="Start impersonating"
        variant="warning"
        risk_items={[
          "You will act and appear on the site as this person until the session ends.",
          "This is recorded in the audit log with your name and the account you viewed.",
          "The session ends automatically after 30 minutes, or immediately if you stop it.",
        ]}
        onConfirm={directory.confirmImpersonate}
        onClose={directory.cancelImpersonate}
      />
    </div>
  );
};

export default UsersDirectoryView;
