"use client";
import React, { useEffect } from "react";
import { CloseIcon, InviteIcon } from "@/icons/workspace-icons";
import SettingsDropdown from "./SettingsDropdown";
import type { UsersManagerApi } from "./useUsersManager";
import type { PlatformRoleName } from "@/types/administration/admin-users";

export type InviteUserModalProps = {
  users: UsersManagerApi;
};

const ROLE_LABELS: Record<PlatformRoleName, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  client: "Client",
};

const inputClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[11px] text-[14px] text-shell-text placeholder:text-shell-text-faint outline-none focus:border-brand-500";

/**
 * "Invite" sub-dialog opened from {@link UsersSection}'s Invite button. Sends a real email
 * invitation (see `Admin\User\UserController::invite`) with a role and optional department
 * pre-assigned; the invitee's account doesn't exist yet, so there's nothing to add to the
 * roster until they accept it.
 */
const InviteUserModal: React.FC<InviteUserModalProps> = ({ users }) => {
  useEffect(() => {
    if (!users.is_invite_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") users.closeInvite();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [users]);

  if (!users.is_invite_open) return null;

  const role_options = users.invitable_roles.map((role) => ({ id: role, label: ROLE_LABELS[role] }));
  const department_options = [
    { id: "", label: "No department" },
    ...users.department_rows.map((department) => ({ id: String(department.id), label: department.name })),
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Invite" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={users.closeInvite} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[90vh] w-[480px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-500/[0.16] text-brand-200">
              <InviteIcon size={17} />
            </span>
            <span className="text-[18px] font-extrabold tracking-[-0.01em]">Invite a new user</span>
          </div>
          <button
            type="button"
            onClick={users.closeInvite}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Email address</div>
            <input
              type="email"
              value={users.invite_email}
              onChange={(event) => users.setInviteEmail(event.target.value)}
              placeholder="name@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Role</div>
            <SettingsDropdown
              value={users.invite_role}
              options={role_options}
              onChange={(value) => users.setInviteRole(value as PlatformRoleName)}
              className="w-full"
            />
          </div>

          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Department</div>
            <SettingsDropdown
              value={users.invite_department_id ? String(users.invite_department_id) : ""}
              options={department_options}
              onChange={(value) => users.setInviteDepartmentId(value ? Number(value) : null)}
              placeholder="No department"
              className="w-full"
            />
          </div>

          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">
              Personal message (optional)
            </div>
            <textarea
              value={users.invite_message}
              onChange={(event) => users.setInviteMessage(event.target.value)}
              placeholder="Add a note to include in the invitation email"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          {users.invite_error ? (
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.1] px-3 py-2.5 text-[13px] font-medium text-brand-200">
              {users.invite_error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-none items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={users.closeInvite}
            className="rounded-lg px-3.5 py-[10px] text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void users.submitInvite()}
            disabled={!users.can_submit_invite}
            className="rounded-lg bg-brand-500 px-5 py-[10px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {users.is_submitting_invite ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
