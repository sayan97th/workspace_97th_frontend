"use client";
import React, { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { PersonAvatar } from "@/components/board";
import { Pagination } from "@/components/content";
import SearchField from "@/components/common/SearchField";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { toPersonOption } from "../adminUserMapping";
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
import InvitationsPanel from "../users/InvitationsPanel";
import UserDetailsDrawer from "../users/UserDetailsDrawer";
import { useStaffInvitationsManager } from "../useStaffInvitationsManager";
import { primaryRole, ROLE_LABELS, USERS_PER_PAGE, type UsersManagerApi } from "../useUsersManager";
import type { AdminUserDto, AdminUsersSortField, PlatformRoleName } from "@/types/administration/admin-users";
import type { ProfileFieldDto } from "@/types/administration/profile-fields";

export type UsersSectionProps = {
  users: UsersManagerApi;
};

type UsersTab = "users" | "invitations";

const role_options = (Object.keys(ROLE_LABELS) as PlatformRoleName[]).map((role) => ({
  id: role,
  label: ROLE_LABELS[role],
}));

const STATUS_STYLES = {
  active: { label: "Active", className: "bg-[#00c875]/[0.14] text-[#3ddc97]" },
  disabled: { label: "Deactivated", className: "bg-[#fdab3d]/[0.14] text-[#ffc46b]" },
  deleted: { label: "Deleted", className: "bg-[#e2445c]/[0.14] text-[#ff8a94]" },
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

/** Administration > Directory > Users: the account's user directory and its invitations. */
const UsersSection: React.FC<UsersSectionProps> = ({ users }) => {
  const [tab, setTab] = useState<UsersTab>("users");
  const [open_menu_id, setOpenMenuId] = useState<number | null>(null);
  const [pending_bulk_deactivate, setPendingBulkDeactivate] = useState(false);
  const invitations = useStaffInvitationsManager(users.invitations_version);

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
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
        Manage everyone on this account, see who&apos;s an admin, deactivate a user, or assign people to departments. Click a
        person to see their details.
      </p>

      <div className="mb-5 flex items-center gap-6 border-b border-shell-border">
        {(
          [
            { id: "users", label: "Users", count: users.user_total },
            { id: "invitations", label: "Invitations", count: invitations.counts.pending },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13.5px] font-semibold transition-colors ${
              tab === item.id
                ? "border-brand-500 text-shell-text"
                : "border-transparent text-shell-text-muted hover:text-shell-text-secondary"
            }`}
          >
            {item.label}
            <span className="rounded-md bg-shell-hover-strong px-1.5 py-px text-[11px] font-bold text-shell-text-muted">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {users.error ? (
        <div className="mb-3.5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {users.error}
        </div>
      ) : null}

      {users.invite_sent_notice || users.notice ? (
        <div className="mb-3.5 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
          {users.notice ?? users.invite_sent_notice}
        </div>
      ) : null}

      {tab === "invitations" ? (
        <InvitationsPanel invitations={invitations} can_manage={users.can_manage_users} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <SearchField
              value={users.user_query}
              onChange={users.setUserQuery}
              placeholder="Search name or email"
              className="w-[280px]"
            />
            <div className="ml-auto flex items-center gap-2">
              {users.can_manage_users ? (
                <button
                  type="button"
                  onClick={() => void users.exportUsers(false)}
                  disabled={users.is_exporting}
                  className="rounded-lg border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[8px] text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:opacity-50"
                >
                  {users.is_exporting ? "Exporting…" : "Export CSV"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={users.openInvite}
                className="flex items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
              >
                <svg width="13" height="13" viewBox="0 0 16 16">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
                Invite
              </button>
            </div>
          </div>

          <AdminFilterBar
            defs={users.filter_defs}
            state={users.filters.filter_state}
            onChange={users.filters.setFilter}
            onClearAll={users.filters.clearFilters}
            className="mb-3.5"
          />

          <div className="mb-2.5 text-[12.5px] text-shell-text-faint">
            Showing {users.user_rows.length} of {users.user_total} users
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: min_table_width }}>
              <div
                className="grid items-center gap-3.5 px-2.5 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.03em] text-shell-text-faint"
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
              <div className="h-px bg-shell-hover" />

              {users.is_loading ? (
                <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading users…</div>
              ) : users.user_rows.length === 0 ? (
                <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">
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
                      className={`grid items-center gap-3.5 border-b border-shell-border px-2.5 py-[10px] text-[12.5px] ${
                        is_selected ? "bg-brand-500/[0.06]" : ""
                      }`}
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
                            className={`truncate text-[13.5px] font-semibold hover:underline ${
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
                        <span className="text-[12.5px] font-medium text-shell-text-muted">{ROLE_LABELS[role]}</span>
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
                        <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${status.className}`}>{status.label}</span>
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
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16">
                            <circle cx="4" cy="8" r="1.3" fill="currentColor" />
                            <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                            <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                          </svg>
                        </button>
                        {open_menu_id === row.id ? (
                          <div className="absolute right-0 top-[30px] z-10 w-[180px] rounded-[10px] border border-shell-border-strong bg-shell-panel p-1.5 shadow-2xl shadow-black/40">
                            <div
                              onClick={() => {
                                users.openDetails(row.id);
                                setOpenMenuId(null);
                              }}
                              className="cursor-pointer rounded-lg px-[10px] py-[9px] text-[13px] font-medium text-shell-text-secondary hover:bg-shell-hover"
                            >
                              View details
                            </div>
                            {users.can_manage_users && !row.deleted_at ? (
                              <div
                                onClick={() => {
                                  users.requestToggleActive(row);
                                  setOpenMenuId(null);
                                }}
                                className="cursor-pointer rounded-lg px-[10px] py-[9px] text-[13px] font-medium text-[#e2445c] hover:bg-[#e2445c]/10"
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
      )}

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
