"use client";
import React, { useState } from "react";
import { PersonAvatar } from "@/components/board";
import { Pagination } from "@/components/content";
import SearchField from "@/components/common/SearchField";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { toPersonOption } from "../adminUserMapping";
import InviteUserModal from "../InviteUserModal";
import SettingsDropdown from "../SettingsDropdown";
import { primaryRole, type UsersManagerApi } from "../useUsersManager";
import type { PlatformRoleName } from "@/types/administration/admin-users";

export type UsersSectionProps = {
  users: UsersManagerApi;
};

const ROLE_LABELS: Record<PlatformRoleName, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  client: "Client",
};

const role_options = (Object.keys(ROLE_LABELS) as PlatformRoleName[]).map((role) => ({
  id: role,
  label: ROLE_LABELS[role],
}));

/** Administration > Directory > Users — the account's user-management table. */
const UsersSection: React.FC<UsersSectionProps> = ({ users }) => {
  const [open_menu_id, setOpenMenuId] = useState<number | null>(null);
  const department_options = [
    { id: "", label: "Choose department" },
    ...users.department_rows.map((department) => ({ id: String(department.id), label: department.name })),
  ];

  return (
    <div>
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
        Manage everyone on this account, see who&apos;s an admin, deactivate a user, or assign people to
        departments.
      </p>

      {users.error ? (
        <div className="mb-3.5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {users.error}
        </div>
      ) : null}

      {users.invite_sent_notice ? (
        <div className="mb-3.5 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
          {users.invite_sent_notice}
        </div>
      ) : null}

      <div className="mb-3.5 flex items-center gap-2.5">
        <SearchField
          value={users.user_query}
          onChange={users.setUserQuery}
          placeholder="Search name or email"
          className="w-[280px]"
        />
        <button
          type="button"
          onClick={users.openInvite}
          className="ml-auto flex items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
        >
          <svg width="13" height="13" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
          Invite
        </button>
      </div>

      <div className="mb-2.5 text-[12.5px] text-shell-text-faint">
        Showing {users.user_rows.length} of {users.user_total} users
      </div>

      <div className="grid grid-cols-[minmax(180px,1fr)_150px_190px_34px] gap-3.5 px-2.5 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
        <span>Name</span>
        <span>User role</span>
        <span>Department</span>
        <span />
      </div>
      <div className="h-px bg-shell-hover" />

      {users.is_loading ? (
        <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading users…</div>
      ) : (
        users.user_rows.map((row) => {
          const person = toPersonOption(row);
          const role = primaryRole(row);
          const is_updating_role = users.is_updating_role_for_id === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(180px,1fr)_150px_190px_34px] items-center gap-3.5 border-b border-shell-border px-2.5 py-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <PersonAvatar person={person} size={28} />
                <span className="min-w-0">
                  <div
                    className={`truncate text-[13.5px] font-semibold ${
                      row.is_active ? "text-shell-text" : "text-shell-text-faint line-through"
                    }`}
                  >
                    {row.full_name}
                  </div>
                  <div className="truncate text-[12px] text-shell-text-muted">{row.email}</div>
                </span>
              </span>

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

              <SettingsDropdown
                value={row.department?.id ? String(row.department.id) : ""}
                options={department_options}
                onChange={(id) => void users.setUserDepartment(row.id, id ? Number(id) : null)}
                placeholder="Choose department"
                is_muted={!row.department}
              />

              <span className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId((current) => (current === row.id ? null : row.id))}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16">
                    <circle cx="4" cy="8" r="1.3" fill="currentColor" />
                    <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                    <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                  </svg>
                </button>
                {open_menu_id === row.id ? (
                  <div className="absolute right-0 top-[30px] z-10 w-[170px] rounded-[10px] border border-shell-border-strong bg-shell-panel p-1.5 shadow-2xl shadow-black/40">
                    <div
                      onClick={() => {
                        users.requestToggleActive(row);
                        setOpenMenuId(null);
                      }}
                      className="cursor-pointer rounded-lg px-[10px] py-[9px] text-[13px] font-medium text-[#e2445c] hover:bg-[#e2445c]/10"
                    >
                      {row.is_active ? "Deactivate user" : "Reactivate user"}
                    </div>
                  </div>
                ) : null}
              </span>
            </div>
          );
        })
      )}

      <Pagination
        current_page={users.page}
        last_page={users.last_page}
        total={users.user_total}
        per_page={20}
        onPageChange={users.setPage}
      />

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

      <InviteUserModal users={users} />
    </div>
  );
};

export default UsersSection;
