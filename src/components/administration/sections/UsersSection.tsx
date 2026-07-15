"use client";
import React, { useState } from "react";
import { PersonAvatar } from "@/components/board";
import SearchField from "@/components/common/SearchField";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import SettingsDropdown from "../SettingsDropdown";
import { ADMIN_ROLE_OPTIONS } from "@/data/administration-data";

export type UsersSectionProps = {
  admin: AdministrationManagerApi;
};

const role_options = ADMIN_ROLE_OPTIONS.map((role) => ({ id: role, label: role }));

/** Administration > Directory > Users — the account's user-management table. */
const UsersSection: React.FC<UsersSectionProps> = ({ admin }) => {
  const [open_menu_id, setOpenMenuId] = useState<string | null>(null);
  const department_options = [
    { id: "", label: "Choose department" },
    ...admin.department_rows.map((department) => ({ id: department.id, label: department.name })),
  ];

  return (
    <div>
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-[#9aa4a5]">
        Manage everyone on this account — see who&apos;s an admin, deactivate a user, or assign people to
        departments.
      </p>

      <div className="mb-3.5 flex items-center gap-2.5">
        <SearchField
          value={admin.user_query}
          onChange={admin.setUserQuery}
          placeholder="Search name or email"
          className="w-[280px]"
        />
        <button
          type="button"
          className="ml-auto flex items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
        >
          <svg width="13" height="13" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
          Invite
        </button>
      </div>

      <div className="mb-2.5 text-[12.5px] text-[#7e8889]">
        Showing {admin.user_rows.length} of {admin.user_total} users
      </div>

      <div className="grid grid-cols-[minmax(180px,1fr)_150px_190px_34px] gap-3.5 px-2.5 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7e8889]">
        <span>Name</span>
        <span>User role</span>
        <span>Department</span>
        <span />
      </div>
      <div className="h-px bg-white/[0.07]" />

      {admin.user_rows.map((row) => {
        const is_deactivated = admin.deactivated_user_ids.includes(row.person.id);
        return (
          <div
            key={row.person.id}
            className="grid grid-cols-[minmax(180px,1fr)_150px_190px_34px] items-center gap-3.5 border-b border-white/[0.045] px-2.5 py-[11px]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar person={row.person} size={28} />
              <span className="min-w-0">
                <div
                  className={`truncate text-[13.5px] font-semibold ${
                    is_deactivated ? "text-[#7e8889] line-through" : "text-[#edf1f1]"
                  }`}
                >
                  {row.person.name}
                </div>
                <div className="truncate text-[12px] text-[#8a9495]">{row.email}</div>
              </span>
            </span>

            <SettingsDropdown
              value={row.role}
              options={role_options}
              onChange={(role) => admin.setUserRole(row.person.id, role as typeof row.role)}
            />

            <SettingsDropdown
              value={row.department_id ?? ""}
              options={department_options}
              onChange={(id) => admin.setUserDepartment(row.person.id, id || null)}
              placeholder="Choose department"
              is_muted={!row.department_id}
            />

            <span className="relative">
              <button
                type="button"
                onClick={() => setOpenMenuId((current) => (current === row.person.id ? null : row.person.id))}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[#9aa4a5] hover:bg-white/[0.08]"
              >
                <svg width="14" height="14" viewBox="0 0 16 16">
                  <circle cx="4" cy="8" r="1.3" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                  <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                </svg>
              </button>
              {open_menu_id === row.person.id ? (
                <div className="absolute right-0 top-[30px] z-10 w-[170px] rounded-[10px] border border-white/[0.12] bg-[#1c2e2c] p-1.5 shadow-2xl shadow-black/40">
                  <div
                    onClick={() => {
                      admin.toggleUserActive(row.person.id);
                      setOpenMenuId(null);
                    }}
                    className="cursor-pointer rounded-lg px-[10px] py-[9px] text-[13px] font-medium text-[#e2445c] hover:bg-[#e2445c]/10"
                  >
                    {is_deactivated ? "Reactivate user" : "Deactivate user"}
                  </div>
                </div>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default UsersSection;
