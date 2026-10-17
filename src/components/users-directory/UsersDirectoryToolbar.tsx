"use client";
import React from "react";
import { InvitationSearchInput, InvitationSelect } from "@/components/invitations";
import { BuildingIcon, MemberIcon } from "@/icons/workspace-icons";
import type { PlatformRoleName } from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";
import type { DepartmentFilter } from "./useUsersDirectory";

const ROLE_OPTIONS: ReadonlyArray<{ value: PlatformRoleName | ""; label: string }> = [
  { value: "", label: "All roles" },
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "client", label: "Client" },
];

export type UsersDirectoryToolbarProps = {
  search_query: string;
  onSearchChange: (value: string) => void;
  role_filter: PlatformRoleName | null;
  onRoleChange: (role: PlatformRoleName | null) => void;
  department_filter: DepartmentFilter | null;
  onDepartmentChange: (department: DepartmentFilter | null) => void;
  department_rows: DepartmentDto[];
  total: number;
  is_loading: boolean;
  has_active_filters: boolean;
  onClearFilters: () => void;
};

/**
 * Search, role and department filters on top of the Manage users list, with the result count.
 * The account status filter lives in the summary cards, sorting in the column headers.
 */
const UsersDirectoryToolbar: React.FC<UsersDirectoryToolbarProps> = ({
  search_query,
  onSearchChange,
  role_filter,
  onRoleChange,
  department_filter,
  onDepartmentChange,
  department_rows,
  total,
  is_loading,
  has_active_filters,
  onClearFilters,
}) => {
  const department_options = [
    { value: "", label: "All departments" },
    { value: "unassigned", label: "No department" },
    ...department_rows.map((department) => ({ value: String(department.id), label: department.name })),
  ];

  return (
    <div className="inv-toolbar">
      <InvitationSearchInput
        value={search_query}
        onChange={onSearchChange}
        placeholder="Search by name or email"
        is_searching={is_loading}
      />

      <InvitationSelect
        value={role_filter ?? ""}
        onChange={(value) => onRoleChange(value ? (value as PlatformRoleName) : null)}
        options={ROLE_OPTIONS}
        label="Filter by role"
        is_active={role_filter !== null}
        icon={<MemberIcon size={14} />}
      />

      <InvitationSelect
        value={department_filter === null ? "" : String(department_filter)}
        onChange={(value) =>
          onDepartmentChange(value === "" ? null : value === "unassigned" ? "unassigned" : Number(value))
        }
        options={department_options}
        label="Filter by department"
        is_active={department_filter !== null}
        icon={<BuildingIcon size={14} />}
      />

      <span className="inv-toolbar-end">
        {has_active_filters ? (
          <button type="button" onClick={onClearFilters} className="inv-button inv-button-ghost">
            Clear filters
          </button>
        ) : null}
        {is_loading ? (
          <span className="inv-skeleton" style={{ width: 72 }} />
        ) : (
          <span className="inv-result-count" aria-live="polite">
            <strong>{total}</strong> {total === 1 ? "user" : "users"}
          </span>
        )}
      </span>
    </div>
  );
};

export default UsersDirectoryToolbar;
