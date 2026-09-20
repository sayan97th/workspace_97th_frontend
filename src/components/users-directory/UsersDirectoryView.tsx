"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import SearchField from "@/components/common/SearchField";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import UsersDirectoryTable from "./UsersDirectoryTable";
import UsersDirectoryFooter from "./UsersDirectoryFooter";
import { PER_PAGE_OPTIONS, useUsersDirectory, type AccountStatusFilter } from "./useUsersDirectory";
import type { PlatformRoleName } from "@/types/administration/admin-users";

/** Roles allowed to view the site's user list, mirroring the Laravel API's `/admin` route group floor. */
const USERS_DIRECTORY_ROLES = ["super_admin", "admin", "staff"];

const PER_PAGE_DROPDOWN_OPTIONS = PER_PAGE_OPTIONS.map((value) => ({
  id: String(value),
  label: `${value} per page`,
}));

const ROLE_FILTER_OPTIONS: { id: string; label: string }[] = [
  { id: "", label: "All roles" },
  { id: "super_admin", label: "Super admin" },
  { id: "admin", label: "Admin" },
  { id: "staff", label: "Staff" },
  { id: "client", label: "Client" },
];

const STATUS_FILTER_OPTIONS: { id: string; label: string }[] = [
  { id: "", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "disabled", label: "Disabled" },
  { id: "deleted", label: "Deleted" },
];

/**
 * Standalone `/users` page: a read-only directory of every account on the site, in a real,
 * filterable, sortable table with each person's name, email, site-wide role, department,
 * active status and join date. Gated to `super_admin`/`admin`/`staff`, the same floor the
 * backend already enforces on `/api/admin/users`.
 */
const UsersDirectoryView: React.FC = () => {
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const directory = useUsersDirectory();

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!hasAnyRole(...USERS_DIRECTORY_ROLES)) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only account administrators and staff can view the user list."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-7">
      <h1 className="mb-1.5 text-[24px] font-extrabold tracking-[-0.01em] text-shell-text">Users</h1>
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
        Every account registered on this site, with their email, site-wide role, department, status and join date.
      </p>

      {directory.error ? (
        <div className="mb-3.5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {directory.error}
        </div>
      ) : null}

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <SearchField
          value={directory.search_query}
          onChange={directory.setSearchQuery}
          placeholder="Search name or email"
          className="w-[280px]"
        />

        <SettingsDropdown
          value={directory.role_filter ?? ""}
          options={ROLE_FILTER_OPTIONS}
          onChange={(value) => directory.setRoleFilter(value ? (value as PlatformRoleName) : null)}
          className="w-[150px]"
        />

        <SettingsDropdown
          value={directory.status_filter ?? ""}
          options={STATUS_FILTER_OPTIONS}
          onChange={(value) => directory.setStatusFilter(value ? (value as AccountStatusFilter) : null)}
          className="w-[150px]"
        />

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12.5px] text-shell-text-faint">Rows per page</span>
          <SettingsDropdown
            value={String(directory.per_page)}
            options={PER_PAGE_DROPDOWN_OPTIONS}
            onChange={(value) => directory.setPerPage(Number(value))}
            className="w-[130px]"
          />
        </div>
      </div>

      <div className="mb-2.5 text-[12.5px] text-shell-text-faint">
        Showing {directory.user_rows.length} of {directory.user_total} users
      </div>

      <UsersDirectoryTable
        user_rows={directory.user_rows}
        is_loading={directory.is_loading}
        sort_field={directory.sort_field}
        sort_direction={directory.sort_direction}
        onSort={directory.toggleSort}
        can_manage={directory.can_manage}
        current_user_id={directory.current_user_id}
        onToggleActive={directory.requestToggleActive}
        onDelete={directory.requestDelete}
        onRestore={directory.requestRestore}
        canImpersonate={directory.canImpersonate}
        onImpersonate={directory.requestImpersonate}
      />

      <UsersDirectoryFooter
        current_page={directory.page}
        last_page={directory.last_page}
        total={directory.user_total}
        onPrevious={() => directory.setPage(directory.page - 1)}
        onNext={() => directory.setPage(directory.page + 1)}
      />

      <ConfirmActionModal
        is_open={directory.user_pending_toggle !== null}
        title={directory.user_pending_toggle?.is_active ? "Disable user login" : "Enable user login"}
        description={
          directory.user_pending_toggle?.is_active ? (
            <>
              This will temporarily disable website access for &quot;{directory.user_pending_toggle?.full_name}&quot;.
              The account and its data are kept as is, and the person will see a message that their account has been
              temporarily disabled the next time they try to sign in. You can re-enable access at any time.
            </>
          ) : (
            <>&quot;{directory.user_pending_toggle?.full_name}&quot; will regain access and be able to sign in again.</>
          )
        }
        confirm_label={directory.user_pending_toggle?.is_active ? "Disable login" : "Enable login"}
        variant={directory.user_pending_toggle?.is_active ? "warning" : "neutral"}
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
          "You can restore the account from the Deleted filter.",
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
