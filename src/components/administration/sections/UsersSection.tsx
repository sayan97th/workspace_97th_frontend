"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Users } from "lucide-react";
import { PersonAvatar } from "@/components/board";
import { Pagination } from "@/components/content";
import SearchField from "@/components/common/SearchField";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import AdminPageActions from "../AdminPageActions";
import { toPersonOption } from "../adminUserMapping";
import InviteButton from "../InviteButton";
import InviteUserModal from "../InviteUserModal";
import SettingsDropdown from "../SettingsDropdown";
import {
  AdminBulkActionBar,
  AdminBulkMenuButton,
  AdminCheckbox,
  AdminFilterBar,
  AdminSortableHeader,
  bulkActionButtonClass,
  bulkDangerButtonClass,
} from "../filters";
import UserDetailsDrawer from "../users/UserDetailsDrawer";
import { primaryRole, ROLE_LABELS, USERS_PER_PAGE, type UsersManagerApi } from "../useUsersManager";
import type { AdminUserDto, AdminUsersSortField, PlatformRoleName } from "@/types/administration/admin-users";
import type { ProfileFieldDto } from "@/types/administration/profile-fields";

export type UsersSectionProps = {
  users: UsersManagerApi;
};

const role_options = (Object.keys(ROLE_LABELS) as PlatformRoleName[]).map((role) => ({
  id: role,
  label: ROLE_LABELS[role],
}));

const STATUS_STYLES = {
  active: { label: "Active", className: "admin-pill-success" },
  disabled: { label: "Deactivated", className: "admin-pill-warning" },
  deleted: { label: "Deleted", className: "admin-pill-danger" },
};

const statusKey = (row: AdminUserDto): keyof typeof STATUS_STYLES =>
  row.deleted_at ? "deleted" : row.is_active ? "active" : "disabled";

/** How a custom profile field value reads in its table cell. */
const displayFieldValue = (field: ProfileFieldDto, value: string | null | undefined): React.ReactNode => {
  if (!value) return <span className="text-shell-text-faint">None</span>;
  if (field.type === "dropdown") {
    const option = field.options.find((candidate) => candidate.id === value);
    if (!option) return <span className="text-shell-text-faint">None</span>;
    return (
      <span className="inline-flex max-w-full items-center gap-1.5">
        {option.color ? <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: option.color }} /> : null}
        <span className="truncate">{option.label}</span>
      </span>
    );
  }
  if (field.type === "date") {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : format(date, "MMM d, yyyy");
  }
  return value;
};

/** Administration > Directory > Users: the account's user directory. Invitations have their own page. */
const UsersSection: React.FC<UsersSectionProps> = ({ users }) => {
  const [open_menu_id, setOpenMenuId] = useState<number | null>(null);
  const [pending_bulk_deactivate, setPendingBulkDeactivate] = useState(false);

  const department_options = useMemo(
    () => [
      { id: "", label: "Choose department" },
      ...users.department_rows.map((department) => ({ id: String(department.id), label: department.name })),
    ],
    [users.department_rows]
  );

  const bulk_department_options = useMemo(
    () => [
      { id: "none", label: "No department" },
      ...users.department_rows.map((department) => ({ id: String(department.id), label: department.name })),
    ],
    [users.department_rows]
  );

  const grid_template = useMemo(
    () =>
      [
        users.can_manage_users ? "34px" : null,
        "minmax(220px,1.5fr)",
        "150px",
        "180px",
        "110px",
        "120px",
        "110px",
        ...users.profile_fields.map(() => "150px"),
        "34px",
      ]
        .filter(Boolean)
        .join(" "),
    [users.can_manage_users, users.profile_fields]
  );
  const min_table_width = 820 + users.profile_fields.length * 162;

  const page_ids = users.user_rows.map((row) => row.id);
  const page_selection = users.selection.pageSelectionState(page_ids);
  const selected_count = users.selection.selected_ids.length;

  const headerSort = (label: string, field: AdminUsersSortField) => (
    <AdminSortableHeader
      label={label}
      field={field}
      sort_field={users.sort_field}
      sort_direction={users.sort_direction}
      onSort={users.toggleSort}
    />
  );

  return (
    <div>
      <AdminPageActions>
        <Link href="/teams" className="admin-button admin-button-secondary">
          <Users size={18} strokeWidth={1.75} aria-hidden="true" />
          Manage teams
        </Link>
        {users.can_manage_users ? (
          <button
            type="button"
            onClick={() => void users.exportUsers(false)}
            disabled={users.is_exporting}
            className="admin-button admin-button-secondary"
          >
            <Download size={18} strokeWidth={1.75} aria-hidden="true" />
            {users.is_exporting ? "Exporting…" : "Export CSV"}
          </button>
        ) : null}
        <InviteButton onClick={users.openInvite} />
      </AdminPageActions>

      {users.error ? (
        <div className="mb-3.5 admin-notice admin-notice-error">
          {users.error}
        </div>
      ) : null}

      {users.invite_sent_notice || users.notice ? (
        <div className="mb-3.5 admin-notice admin-notice-success">
          {users.notice ?? users.invite_sent_notice}
        </div>
      ) : null}

      <>
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <SearchField
              value={users.user_query}
              onChange={users.setUserQuery}
              placeholder="Search user name or email"
              className="w-[320px] max-w-full"
            />
          </div>

          <AdminFilterBar
            defs={users.filter_defs}
            state={users.filters.filter_state}
            onChange={users.filters.setFilter}
            onClearAll={users.filters.clearFilters}
            className="mb-3.5"
          />

          <div className="admin-table-caption">
            Showing {users.user_rows.length} of {users.user_total} results
          </div>

          <div className="admin-table">
            <div style={{ minWidth: min_table_width }}>
              <div
                className="grid items-center gap-3.5 admin-table-head"
                style={{ gridTemplateColumns: grid_template }}
              >
                {users.can_manage_users ? (
                  <button
                    type="button"
                    onClick={() => users.selection.togglePage(page_ids)}
                    aria-label="Select all users on this page"
                    className="flex items-center"
                  >
                    <AdminCheckbox is_checked={page_selection === "all"} is_indeterminate={page_selection === "some"} />
                  </button>
                ) : null}
                {headerSort("Name", "name")}
                {headerSort("User role", "role")}
                {headerSort("Department", "department")}
                {headerSort("Status", "status")}
                {headerSort("Last active", "last_active")}
                {headerSort("Date added", "created_at")}
                {users.profile_fields.map((field) => (
                  <span key={field.id} className="truncate normal-case tracking-normal">
                    {field.name}
                  </span>
                ))}
                <span />
              </div>

              {users.is_loading ? (
                <div className="admin-table-empty">Loading users…</div>
              ) : users.user_rows.length === 0 ? (
                <div className="admin-table-empty">
                  No users match these filters.
                </div>
              ) : (
                users.user_rows.map((row) => {
                  const person = toPersonOption(row);
                  const role = primaryRole(row);
                  const is_updating_role = users.is_updating_role_for_id === row.id;
                  const status = STATUS_STYLES[statusKey(row)];
                  const is_selected = users.selection.isSelected(row.id);

                  return (
                    <div
                      key={row.id}
                      className="grid items-center gap-3.5 admin-table-row"
                      data-selected={is_selected || undefined}
                      style={{ gridTemplateColumns: grid_template }}
                    >
                      {users.can_manage_users ? (
                        <button
                          type="button"
                          onClick={() => users.selection.toggle(row.id)}
                          aria-label={`Select ${row.full_name}`}
                          className="flex items-center"
                        >
                          <AdminCheckbox is_checked={is_selected} />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => users.openDetails(row.id)}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                      >
                        <PersonAvatar person={person} size={28} />
                        <span className="min-w-0">
                          <div
                            className={`truncate text-[14px] hover:underline ${
                              row.is_active && !row.deleted_at ? "text-shell-text" : "text-shell-text-faint line-through"
                            }`}
                          >
                            {row.full_name}
                          </div>
                          <div className="truncate text-[12px] text-shell-text-muted">{row.email}</div>
                        </span>
                      </button>

                      {users.can_edit_roles ? (
                        <SettingsDropdown
                          value={role}
                          options={role_options}
                          onChange={(value) => void users.setUserRole(row, value as PlatformRoleName)}
                          className={is_updating_role ? "opacity-60" : undefined}
                        />
                      ) : (
                        <span>{ROLE_LABELS[role]}</span>
                      )}

                      {users.can_manage_users ? (
                        <SettingsDropdown
                          value={row.department?.id ? String(row.department.id) : ""}
                          options={department_options}
                          onChange={(id) => void users.setUserDepartment(row.id, id ? Number(id) : null)}
                          placeholder="Choose department"
                          is_muted={!row.department}
                        />
                      ) : (
                        <span className="truncate text-shell-text-muted">{row.department?.name ?? "None"}</span>
                      )}

                      <span>
                        <span className={`admin-pill ${status.className}`}>{status.label}</span>
                      </span>

                      <span
                        className="truncate text-shell-text-muted"
                        title={row.last_active_at ? format(new Date(row.last_active_at), "MMM d, yyyy p") : undefined}
                      >
                        {row.last_active_at ? formatDistanceToNow(new Date(row.last_active_at), { addSuffix: true }) : "Never"}
                      </span>

                      <span className="text-shell-text-muted">{format(new Date(row.created_at), "MMM d, yyyy")}</span>

                      {users.profile_fields.map((field) => (
                        <span key={field.id} className="truncate text-shell-text-secondary">
                          {displayFieldValue(field, row.profile_fields?.[String(field.id)])}
                        </span>
                      ))}

                      <span className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((current) => (current === row.id ? null : row.id))}
                          aria-label={`Actions for ${row.full_name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-shell-text hover:bg-[var(--admin-hover)]"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16">
                            <circle cx="4" cy="8" r="1.3" fill="currentColor" />
                            <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                            <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                          </svg>
                        </button>
                        {open_menu_id === row.id ? (
                          <div className="absolute right-0 top-[34px] z-10 w-[200px] rounded-lg bg-shell-panel p-2 shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
                            <div
                              onClick={() => {
                                users.openDetails(row.id);
                                setOpenMenuId(null);
                              }}
                              className="cursor-pointer rounded-[4px] px-2 py-1.5 text-[14px] text-shell-text hover:bg-[var(--admin-hover)]"
                            >
                              View details
                            </div>
                            {users.can_manage_users && !row.deleted_at ? (
                              <div
                                onClick={() => {
                                  users.requestToggleActive(row);
                                  setOpenMenuId(null);
                                }}
                                className="cursor-pointer rounded-[4px] px-2 py-1.5 text-[14px] admin-danger-action"
                              >
                                {row.is_active ? "Deactivate user" : "Reactivate user"}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Pagination
            current_page={users.page}
            last_page={users.last_page}
            total={users.user_total}
            per_page={USERS_PER_PAGE}
            onPageChange={users.setPage}
          />

          <AdminBulkActionBar selected_count={selected_count} noun="user" onClear={users.selection.clear}>
            <AdminBulkMenuButton
              label="Department"
              title="Move to department"
              options={bulk_department_options}
              is_disabled={users.is_running_bulk_action}
              onSelect={(id) =>
                void users.runBulkAction("set_department", { department_id: id === "none" ? null : Number(id) })
              }
            />
            {users.can_edit_roles ? (
              <AdminBulkMenuButton
                label="Role"
                title="Change role to"
                options={role_options}
                is_disabled={users.is_running_bulk_action}
                onSelect={(id) => void users.runBulkAction("set_role", { role: id as PlatformRoleName })}
              />
            ) : null}
            <button
              type="button"
              disabled={users.is_running_bulk_action}
              onClick={() => void users.runBulkAction("reactivate")}
              className={bulkActionButtonClass}
            >
              Reactivate
            </button>
            <button
              type="button"
              disabled={users.is_exporting}
              onClick={() => void users.exportUsers(true)}
              className={bulkActionButtonClass}
            >
              Export
            </button>
            <button
              type="button"
              disabled={users.is_running_bulk_action}
              onClick={() => setPendingBulkDeactivate(true)}
              className={bulkDangerButtonClass}
            >
              Deactivate
            </button>
          </AdminBulkActionBar>
      </>

      <ConfirmActionModal
        is_open={users.user_pending_toggle !== null}
        title={users.user_pending_toggle?.is_active ? "Deactivate user" : "Reactivate user"}
        description={
          users.user_pending_toggle?.is_active
            ? `"${users.user_pending_toggle?.full_name}" will lose access to this account until reactivated.`
            : `"${users.user_pending_toggle?.full_name}" will regain access to this account.`
        }
        confirm_label={users.user_pending_toggle?.is_active ? "Deactivate" : "Reactivate"}
        danger={users.user_pending_toggle?.is_active}
        onConfirm={users.confirmToggleActive}
        onClose={users.cancelToggleActive}
      />

      <ConfirmActionModal
        is_open={pending_bulk_deactivate}
        title={selected_count === 1 ? "Deactivate 1 user" : `Deactivate ${selected_count} users`}
        description="The selected people will lose access to this account until reactivated. Your own account and people you can't manage are skipped."
        confirm_label="Deactivate"
        variant="danger"
        onConfirm={async () => {
          await users.runBulkAction("deactivate");
          setPendingBulkDeactivate(false);
        }}
        onClose={() => setPendingBulkDeactivate(false)}
      />

      <UserDetailsDrawer
        user_id={users.details_user_id}
        profile_fields={users.profile_fields}
        can_manage={users.can_manage_users}
        onClose={users.closeDetails}
        onUserUpdated={users.replaceRow}
        onRequestToggleActive={users.requestToggleActive}
      />

      <InviteUserModal users={users} />
    </div>
  );
};

export default UsersSection;
