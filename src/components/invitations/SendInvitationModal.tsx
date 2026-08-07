"use client";

import React, { useState } from "react";
import { invitationService } from "@/services/invitation.service";
import type { WorkspaceMembershipRole } from "@/types/invitation";
import type { ApiError } from "@/types/auth";
import { CheckIcon, CloseIcon, CrownIcon, EyeIcon, InviteIcon, MemberIcon } from "@/icons/workspace-icons";

const ROLE_OPTIONS: Array<{ value: WorkspaceMembershipRole; label: string; hint: string; Icon: typeof CrownIcon }> = [
  { value: "owner", label: "Owner", hint: "Full access", Icon: CrownIcon },
  { value: "member", label: "Member", hint: "Can create and edit", Icon: MemberIcon },
  { value: "viewer", label: "Viewer", hint: "Read-only access", Icon: EyeIcon },
];

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

export type SendInvitationModalProps = {
  is_open: boolean;
  onClose: () => void;
  workspace_slug: string;
  /** Called after a successful send so the table can refetch. */
  onSent: () => void;
};

/**
 * "Invite Member" form embedded directly in the "Sent invitations" view —
 * ported structurally from `base_portal`'s `AdminInvitationsContent` modal +
 * confirm dialog (single email, single role, a confirmation step before the
 * request fires), restyled onto this app's `shell-*` tokens.
 */
const SendInvitationModal: React.FC<SendInvitationModalProps> = ({ is_open, onClose, workspace_slug, onSent }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMembershipRole>("member");
  const [is_sending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_success, setSendSuccess] = useState(false);
  const [show_confirm, setShowConfirm] = useState(false);

  if (!is_open) return null;

  const resetAndClose = () => {
    setEmail("");
    setRole("member");
    setSendError(null);
    setSendSuccess(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setSendError(null);
    setIsSending(true);
    try {
      await invitationService.sendInvitation(workspace_slug, email, role);
      setSendSuccess(true);
      onSent();
      window.setTimeout(resetAndClose, 1800);
    } catch (error) {
      setSendError(apiErrorMessage(error, "Failed to send invitation."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={resetAndClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl border border-shell-border bg-shell-panel shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10">
              <InviteIcon size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-shell-text">Invite a Team Member</h2>
              <p className="text-xs text-shell-text-muted">They will receive an email with a sign-up link.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-1.5 text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {send_success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-400">
              <CheckIcon size={16} className="flex-none" />
              Invitation sent successfully! Closing…
            </div>
          )}
          {send_error && (
            <div className="mb-4 rounded-lg bg-error-500/10 p-3 text-sm text-error-400">{send_error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite_email" className="mb-1.5 block text-sm font-medium text-shell-text-secondary">
                Email address
              </label>
              <input
                id="invite_email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
                disabled={is_sending || send_success}
                className="h-11 w-full rounded-lg border border-shell-border-strong bg-shell-bg px-4 text-sm text-shell-text placeholder:text-shell-text-muted outline-none focus:border-brand-400 disabled:opacity-60"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-shell-text-secondary">Role</span>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((option) => {
                  const is_selected = role === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                        is_selected ? "border-brand-400 bg-brand-500/10" : "border-shell-border-strong bg-shell-bg hover:border-shell-border-strong"
                      }`}
                    >
                      <input
                        type="radio"
                        name="invite_role"
                        value={option.value}
                        checked={is_selected}
                        onChange={() => setRole(option.value)}
                        disabled={is_sending || send_success}
                        className="sr-only"
                      />
                      <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${is_selected ? "bg-brand-500/20" : "bg-shell-hover"}`}>
                        <option.Icon size={15} className={is_selected ? "text-brand-400" : "text-shell-text-muted"} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${is_selected ? "text-brand-300" : "text-shell-text"}`}>{option.label}</p>
                        <p className="text-xs text-shell-text-muted">{option.hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-lg border border-shell-border-strong px-4 py-2.5 text-sm font-medium text-shell-text-secondary transition-colors hover:text-shell-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={is_sending || send_success}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {is_sending ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {show_confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={() => setShowConfirm(false)} aria-hidden="true" />
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-shell-border bg-shell-panel p-6 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
              <InviteIcon size={22} className="text-brand-400" />
            </div>

            <h3 className="text-lg font-semibold text-shell-text">Confirm Invitation</h3>

            <p className="mt-2 text-sm text-shell-text-muted">
              You&apos;re about to send an invitation to{" "}
              <span className="font-medium text-shell-text">{email}</span> granting them access to this workspace as
              a{" "}
              <span className="font-medium capitalize text-brand-400">{role}</span>.
            </p>
            <p className="mt-2 text-sm text-shell-text-muted">
              Once accepted, they will become an active member of this workspace.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-shell-border-strong px-4 py-2 text-sm font-medium text-shell-text-secondary transition-colors hover:text-shell-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Yes, send invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendInvitationModal;
