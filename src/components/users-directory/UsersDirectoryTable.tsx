import React from "react";
import { PersonAvatar } from "@/components/board";
import { toPersonOption } from "@/components/administration/adminUserMapping";
import { primaryRole } from "@/components/administration/useUsersManager";
import UserRoleBadge from "./UserRoleBadge";
import UserStatusBadge from "./UserStatusBadge";
import type { AdminUserDto } from "@/types/administration/admin-users";

const COLUMN_COUNT = 5;
const SKELETON_ROWS = 8;

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString();

export type UsersDirectoryTableProps = {
  user_rows: AdminUserDto[];
  is_loading: boolean;
};

/**
 * Real `<table>` roster for the standalone Users directory: name, email, site-wide role,
 * department, active status and join date, one row per account. Mirrors the shape of
 * `InvitationsTable` (skeleton rows while loading, an empty state, hoverable rows) so every
 * account-wide roster in the app reads the same way.
 */
const UsersDirectoryTable: React.FC<UsersDirectoryTableProps> = ({ user_rows, is_loading }) => (
  <div className="overflow-x-auto rounded-[10px] border border-shell-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-shell-border bg-shell-panel-alt">
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Role
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Department
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Joined
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-shell-border">
        {is_loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, row_index) => (
            <tr key={row_index}>
              {Array.from({ length: COLUMN_COUNT }).map((__, column_index) => (
                <td key={column_index} className="px-4 py-4">
                  <div className="h-4 animate-pulse rounded bg-shell-hover" />
                </td>
              ))}
            </tr>
          ))
        ) : user_rows.length === 0 ? (
          <tr>
            <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center">
              <div className="flex flex-col items-center gap-2 text-shell-text-muted">
                <svg className="h-8 w-8 text-shell-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.964 0a9 9 0 10-11.964 0m11.964 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-shell-text-secondary">No users found</p>
                <p className="text-xs text-shell-text-faint">Try adjusting your search</p>
              </div>
            </td>
          </tr>
        ) : (
          user_rows.map((row) => {
            const person = toPersonOption(row);
            const role = primaryRole(row);

            return (
              <tr key={row.id} className="transition-colors hover:bg-shell-hover">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PersonAvatar person={person} size={28} />
                    <div className="min-w-0">
                      <div
                        className={`truncate text-[13.5px] font-semibold ${
                          row.is_active ? "text-shell-text" : "text-shell-text-faint line-through"
                        }`}
                      >
                        {row.full_name}
                      </div>
                      <div className="truncate text-xs text-shell-text-muted">{row.email}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <UserRoleBadge role={role} />
                </td>

                <td className="px-4 py-3 text-sm text-shell-text-muted">
                  {row.department?.name ?? <span className="text-shell-text-faint">Unassigned</span>}
                </td>

                <td className="px-4 py-3">
                  <UserStatusBadge is_active={row.is_active} />
                </td>

                <td className="px-4 py-3 text-sm text-shell-text-muted">{formatDate(row.created_at)}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default UsersDirectoryTable;
