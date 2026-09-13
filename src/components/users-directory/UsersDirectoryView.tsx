"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { Pagination } from "@/components/content";
import SearchField from "@/components/common/SearchField";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import UsersDirectoryTable from "./UsersDirectoryTable";
import { PER_PAGE_OPTIONS, useUsersDirectory } from "./useUsersDirectory";

/** Roles allowed to view the site's user list, mirroring the Laravel API's `/admin` route group floor. */
const USERS_DIRECTORY_ROLES = ["super_admin", "admin", "staff"];

const PER_PAGE_DROPDOWN_OPTIONS = PER_PAGE_OPTIONS.map((value) => ({
  id: String(value),
  label: `${value} per page`,
}));

/**
 * Standalone `/users` page: a read-only directory of every account on the site, in a real
 * table with each person's name, email, site-wide role, department, active status and join
 * date. Gated to `super_admin`/`admin`/`staff`, the same floor the backend already enforces
 * on `/api/admin/users`.
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
    <div className="mx-auto max-w-[1120px] px-8 py-7">
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

      <UsersDirectoryTable user_rows={directory.user_rows} is_loading={directory.is_loading} />

      <Pagination
        current_page={directory.page}
        last_page={directory.last_page}
        total={directory.user_total}
        per_page={directory.per_page}
        onPageChange={directory.setPage}
      />
    </div>
  );
};

export default UsersDirectoryView;
