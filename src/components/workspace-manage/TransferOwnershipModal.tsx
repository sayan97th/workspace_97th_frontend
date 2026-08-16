"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { workspaceService } from "@/services/workspace.service";
import { gradientForId, initialsFromName } from "./creatorAvatar";
import CreatorAvatar from "@/components/content/CreatorAvatar";
import { CheckCircleIcon, CrownIcon, EyeIcon, LeaveWorkspaceIcon, MemberIcon } from "@/icons/workspace-icons";
import type { ApiError } from "@/types/auth";
import type { SelfRoleAfterTransfer, TransferOwnershipPayload, WorkspaceMember } from "@/types/workspace";

/** The two "stay on" outcomes; "leave" is rendered separately below, set apart with its own persistent warning styling. */
const STAY_ROLE_OPTIONS: Array<{
  value: Exclude<SelfRoleAfterTransfer, "leave">;
  label: string;
  hint: string;
  Icon: typeof CrownIcon;
}> = [
  { value: "member", label: "Stay as a Member", hint: "Can create and edit boards, items and updates.", Icon: MemberIcon },
  { value: "viewer", label: "Stay as a Viewer", hint: "Can view boards and updates but cannot make changes.", Icon: EyeIcon },
];

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

export type TransferOwnershipModalProps = {
  is_open: boolean;
  onClose: () => void;
  workspace_slug: string;
  workspace_name: string;
  onSubmit: (payload: TransferOwnershipPayload) => Promise<void>;
};

/**
 * Lets the current owner hand off the "owner" role to another member, and,
 * in the same step, choose what happens to themselves: stay on with a new
 * role, or leave the workspace entirely. A two-step form -> confirm flow,
 * since both outcomes are consequential and hard to undo from this dialog.
 */
const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  is_open,
  onClose,
  workspace_slug,
  workspace_name,
  onSubmit,
}) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [is_loading_members, setIsLoadingMembers] = useState(true);
  const [members_error, setMembersError] = useState<string | null>(null);
  const [new_owner_id, setNewOwnerId] = useState<number | null>(null);
  const [self_role, setSelfRole] = useState<SelfRoleAfterTransfer>("member");
  const [show_confirm, setShowConfirm] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    setNewOwnerId(null);
    setSelfRole("member");
    setShowConfirm(false);
    setSubmitError(null);
    setIsLoadingMembers(true);
    setMembersError(null);

    let cancelled = false;
    workspaceService
      .getWorkspaceMembers(workspace_slug)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch(() => {
        if (!cancelled) setMembersError("We couldn't load this workspace's members.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [is_open, workspace_slug]);

  if (!is_open) return null;

  const candidates = members.filter((member) => member.id !== user?.id);
  const new_owner = candidates.find((member) => member.id === new_owner_id) ?? null;
  const can_continue = new_owner_id !== null;

  const resetAndClose = () => {
    if (is_submitting) return;
    onClose();
  };

  const handleConfirmTransfer = async () => {
    if (new_owner_id === null) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ new_owner_id, self_role });
      onClose();
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "We couldn't transfer ownership. Please try again."));
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={resetAndClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl border border-shell-border bg-shell-panel shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10">
              <CrownIcon size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-shell-text">Transfer ownership</h2>
              <p className="text-xs text-shell-text-muted">Choose who takes over as owner of {workspace_name}.</p>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {submit_error && (
            <div className="mb-4 rounded-lg bg-error-500/10 p-3 text-sm text-error-400">{submit_error}</div>
          )}

          {is_loading_members ? (
            <p className="py-8 text-center text-sm text-shell-text-muted">Loading members…</p>
          ) : members_error ? (
            <p className="py-8 text-center text-sm text-error-400">{members_error}</p>
          ) : candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-shell-text-muted">
              Invite someone else to this workspace before you can transfer ownership.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-shell-text-secondary">New owner</span>
                <div className="space-y-2">
                  {candidates.map((member) => {
                    const [gradient_from, gradient_to] = gradientForId(member.id);
                    const is_selected = new_owner_id === member.id;
                    return (
                      <label
                        key={member.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                          is_selected
                            ? "border-brand-400 bg-brand-500/10"
                            : "border-shell-border-strong bg-shell-bg hover:border-shell-border-strong"
                        }`}
                      >
                        <input
                          type="radio"
                          name="new_owner_id"
                          value={member.id}
                          checked={is_selected}
                          onChange={() => setNewOwnerId(member.id)}
                          disabled={is_submitting}
                          className="sr-only"
                        />
                        <CreatorAvatar
                          initials={initialsFromName(member.full_name)}
                          gradient_from={gradient_from}
                          gradient_to={gradient_to}
                          photo_url={member.profile_photo_url}
                          title={member.full_name}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-shell-text">
                            {member.full_name}
                          </span>
                          <span className="block truncate text-xs text-shell-text-muted">{member.email}</span>
                        </span>
                        {is_selected && <CheckCircleIcon selected size={16} className="flex-none text-brand-400" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-shell-text-secondary">
                  Your role after the transfer
                </span>
                <div className="space-y-2">
                  {STAY_ROLE_OPTIONS.map((option) => {
                    const is_selected = self_role === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                          is_selected
                            ? "border-brand-400 bg-brand-500/10"
                            : "border-shell-border-strong bg-shell-bg hover:border-shell-border-strong"
                        }`}
                      >
                        <input
                          type="radio"
                          name="self_role"
                          value={option.value}
                          checked={is_selected}
                          onChange={() => setSelfRole(option.value)}
                          disabled={is_submitting}
                          className="sr-only"
                        />
                        <div
                          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                            is_selected ? "bg-brand-500/20" : "bg-shell-hover"
                          }`}
                        >
                          <option.Icon size={15} className={is_selected ? "text-brand-400" : "text-shell-text-muted"} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${is_selected ? "text-brand-300" : "text-shell-text"}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-shell-text-muted">{option.hint}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="my-3 h-px bg-shell-border" />

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-l-[3px] border-y border-r p-3 transition-all ${
                    self_role === "leave"
                      ? "border-y-error-500/40 border-r-error-500/40 border-l-error-500 bg-error-500/[0.06]"
                      : "border-y-shell-border-strong border-r-shell-border-strong border-l-error-500/50 bg-shell-bg hover:border-l-error-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="self_role"
                    value="leave"
                    checked={self_role === "leave"}
                    onChange={() => setSelfRole("leave")}
                    disabled={is_submitting}
                    className="sr-only"
                  />
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-error-500/10">
                    <LeaveWorkspaceIcon size={15} className="text-error-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-error-300">Leave the workspace</p>
                    <p className="text-xs text-shell-text-muted">You&apos;ll lose access until someone invites you back.</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-shell-border px-6 py-5">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={is_submitting}
            className="rounded-lg border border-shell-border-strong px-4 py-2.5 text-sm font-medium text-shell-text-secondary transition-colors hover:text-shell-text disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!can_continue || is_submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </div>

      {show_confirm && new_owner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[#060e0e]/[0.62]"
            onClick={() => !is_submitting && setShowConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-shell-border bg-shell-panel p-6 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
              <CrownIcon size={22} className="text-brand-400" />
            </div>

            <h3 className="text-lg font-semibold text-shell-text">Confirm transfer</h3>

            <p className="mt-2 text-sm text-shell-text-muted">
              <span className="font-medium text-shell-text">{new_owner.full_name}</span> will become the owner of{" "}
              <span className="font-medium text-shell-text">{workspace_name}</span>.
            </p>
            <p className="mt-2 text-sm text-shell-text-muted">
              {self_role === "leave" ? (
                <>You will leave this workspace and lose access to it immediately.</>
              ) : (
                <>
                  You&apos;ll continue on as a <span className="font-medium capitalize text-shell-text">{self_role}</span>.
                </>
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={is_submitting}
                className="rounded-lg border border-shell-border-strong px-4 py-2 text-sm font-medium text-shell-text-secondary transition-colors hover:text-shell-text disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={is_submitting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  self_role === "leave" ? "bg-error-500 hover:bg-error-600" : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {is_submitting ? "Transferring…" : "Yes, transfer ownership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferOwnershipModal;
