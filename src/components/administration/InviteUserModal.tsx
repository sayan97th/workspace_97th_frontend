"use client";
import React, { useEffect } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { InvitationAvatar, PLATFORM_ROLE_META } from "@/components/invitations";
import "@/components/invitations/invitations.scss";
import { AlertCircleIcon, BuildingIcon, ChevronDownIcon, CloseIcon, InviteIcon, MailIcon } from "@/icons/workspace-icons";
import type { UsersManagerApi } from "./useUsersManager";

/** The slice of {@link UsersManagerApi} the dialog reads, so pages other than Users (Teams) can drive it with their own hook. */
export type InviteUserApi = Pick<
  UsersManagerApi,
  | "is_invite_open"
  | "closeInvite"
  | "invitable_roles"
  | "department_rows"
  | "invite_email"
  | "setInviteEmail"
  | "invite_role"
  | "setInviteRole"
  | "invite_department_id"
  | "setInviteDepartmentId"
  | "invite_message"
  | "setInviteMessage"
  | "invite_error"
  | "is_submitting_invite"
  | "can_submit_invite"
  | "submitInvite"
>;

export type InviteUserModalProps = {
  users: InviteUserApi;
};

/** Same layer the dialog always used, so it stays above the Administration and Teams pages. */
const MODAL_Z_INDEX = 420;

/**
 * "Invite a new user" dialog opened from the Users, Invitations and Teams pages. Sends a real
 * email invitation (see `Admin\User\UserController::invite`) with a role and optional department
 * pre-assigned; the invitee's account doesn't exist yet, so there's nothing to add to the
 * roster until they accept it. Styled with the shared `--inv-*` tokens in invitations.scss.
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

  const email = users.invite_email.trim();
  const role_meta = PLATFORM_ROLE_META[users.invite_role];
  const department_name = users.department_rows.find((department) => department.id === users.invite_department_id)?.name;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (users.can_submit_invite) void users.submitInvite();
  };

  return (
    <div
      className="invitations-theme inv-modal-root"
      style={{ zIndex: MODAL_Z_INDEX }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite_user_title"
    >
      <div className="inv-modal-backdrop" onClick={users.closeInvite} aria-hidden="true" />

      <div className="inv-modal">
        <div className="inv-modal-header">
          <span className="inv-empty-icon !mb-0 !h-10 !w-10 flex-none">
            <InviteIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="invite_user_title" className="font-heading text-dialog-title text-[var(--inv-text)]">
              Invite a new user
            </h2>
            <p className="inv-modal-subtitle">
              They get an email with a link to create their account. The link works for 7 days.
            </p>
          </div>
          <PortalTooltip content="Close">
            <button type="button" aria-label="Close" onClick={users.closeInvite} className="inv-icon-button">
              <CloseIcon size={16} />
            </button>
          </PortalTooltip>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="inv-modal-body space-y-5">
            {users.invite_error ? (
              <div role="alert" className="inv-notice !mb-0" data-tone="danger">
                <AlertCircleIcon size={16} />
                <span>{users.invite_error}</span>
              </div>
            ) : null}

            <div>
              <label htmlFor="invite_user_email" className="inv-label">
                Email address
              </label>
              <div className="inv-field w-full">
                <span className="inv-field-icon !left-3">
                  <MailIcon size={15} />
                </span>
                <input
                  id="invite_user_email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="off"
                  value={users.invite_email}
                  onChange={(event) => users.setInviteEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="inv-input inv-input-lg w-full"
                />
              </div>
            </div>

            <fieldset>
              <legend className="inv-label">Role</legend>
              <div className="inv-role-grid" data-columns="2">
                {users.invitable_roles.map((role) => {
                  const meta = PLATFORM_ROLE_META[role];
                  const is_selected = users.invite_role === role;
                  return (
                    <label key={role} className="inv-role-option" data-selected={is_selected ? "true" : "false"}>
                      <input
                        type="radio"
                        name="invite_user_role"
                        value={role}
                        checked={is_selected}
                        onChange={() => users.setInviteRole(role)}
                        className="sr-only"
                      />
                      <span className="inv-role-option-icon">
                        <meta.Icon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="inv-role-option-label block">{meta.label}</span>
                        <span className="inv-role-option-hint block">{meta.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="invite_user_department" className="inv-label">
                Department
              </label>
              <span className="inv-field w-full">
                <span className="inv-field-icon !left-3">
                  <BuildingIcon size={15} />
                </span>
                <select
                  id="invite_user_department"
                  value={users.invite_department_id ? String(users.invite_department_id) : ""}
                  onChange={(event) => users.setInviteDepartmentId(event.target.value ? Number(event.target.value) : null)}
                  className="inv-select inv-input-lg w-full"
                >
                  <option value="">No department</option>
                  {users.department_rows.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <span className="inv-field-trailing !right-3">
                  <ChevronDownIcon size={12} />
                </span>
              </span>
            </div>

            <div>
              <label htmlFor="invite_user_message" className="inv-label">
                Personal message <span className="inv-muted font-normal">(optional)</span>
              </label>
              <textarea
                id="invite_user_message"
                value={users.invite_message}
                onChange={(event) => users.setInviteMessage(event.target.value)}
                placeholder="Add a note to include in the invitation email"
                rows={3}
                className="inv-input inv-textarea"
              />
            </div>

            {email ? (
              <div className="inv-summary !mt-0 flex items-start gap-3">
                <InvitationAvatar email={email} size={32} />
                <span className="min-w-0">
                  <strong className="block truncate">{email}</strong>
                  joins as <strong>{role_meta.label}</strong>
                  {department_name ? (
                    <>
                      {" "}
                      in <strong>{department_name}</strong>
                    </>
                  ) : null}
                  .
                </span>
              </div>
            ) : null}
          </div>

          <div className="inv-modal-footer">
            <button type="button" onClick={users.closeInvite} className="inv-button inv-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={!users.can_submit_invite} className="inv-button inv-button-primary">
              {users.is_submitting_invite ? <span className="inv-spinner" aria-hidden /> : null}
              {users.is_submitting_invite ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
