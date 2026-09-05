"use client";

import React, { useEffect, useRef, useState } from "react";
import { invitationService } from "@/services/invitation.service";
import type { WorkspaceInvitationCandidate, WorkspaceMembershipRole } from "@/types/invitation";
import type { ApiError } from "@/types/auth";
import { CheckIcon, CloseIcon, CrownIcon, EyeIcon, InviteIcon, MemberIcon, SearchIcon } from "@/icons/workspace-icons";
import CreatorAvatar from "@/components/content/CreatorAvatar";
import { gradientForId, initialsFromName } from "@/components/workspace-manage/creatorAvatar";

/** How long to wait after the last keystroke before searching the "pool of users". */
const CANDIDATE_SEARCH_DEBOUNCE_MS = 250;

/** Minimum characters typed before the "pool of users" autocomplete fires — mirrors the backend's own floor. */
const CANDIDATE_MIN_SEARCH_LENGTH = 2;

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

  // "Pool of users" autocomplete: lets an owner/admin pick a known teammate
  // (e.g. Amanda) instead of having to know and type her exact email address.
  const [candidates, setCandidates] = useState<WorkspaceInvitationCandidate[]>([]);
  const [is_searching_candidates, setIsSearchingCandidates] = useState(false);
  const [show_candidates, setShowCandidates] = useState(false);
  const [selected_candidate, setSelectedCandidate] = useState<WorkspaceInvitationCandidate | null>(null);
  const search_debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search_request_id_ref = useRef(0);

  useEffect(() => {
    return () => {
      if (search_debounce_ref.current) clearTimeout(search_debounce_ref.current);
    };
  }, []);

  if (!is_open) return null;

  const resetAndClose = () => {
    setEmail("");
    setRole("member");
    setSendError(null);
    setSendSuccess(false);
    setShowConfirm(false);
    setCandidates([]);
    setShowCandidates(false);
    setSelectedCandidate(null);
    onClose();
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setSelectedCandidate(null);

    if (search_debounce_ref.current) clearTimeout(search_debounce_ref.current);

    const search_term = value.trim();
    if (search_term.length < CANDIDATE_MIN_SEARCH_LENGTH) {
      setCandidates([]);
      setIsSearchingCandidates(false);
      setShowCandidates(false);
      return;
    }

    setShowCandidates(true);
    setIsSearchingCandidates(true);
    const request_id = ++search_request_id_ref.current;

    search_debounce_ref.current = setTimeout(async () => {
      try {
        const results = await invitationService.searchAvailableUsers(workspace_slug, search_term);
        if (request_id === search_request_id_ref.current) setCandidates(results);
      } catch {
        if (request_id === search_request_id_ref.current) setCandidates([]);
      } finally {
        if (request_id === search_request_id_ref.current) setIsSearchingCandidates(false);
      }
    }, CANDIDATE_SEARCH_DEBOUNCE_MS);
  };

  const handleSelectCandidate = (candidate: WorkspaceInvitationCandidate) => {
    setEmail(candidate.email);
    setSelectedCandidate(candidate);
    setShowCandidates(false);
    setCandidates([]);
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
              <p className="text-xs text-shell-text-muted">Search for someone already on the platform, or invite by email.</p>
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
            <div className="relative">
              <label htmlFor="invite_email" className="mb-1.5 block text-sm font-medium text-shell-text-secondary">
                Teammate or email address
              </label>
              <div className="relative">
                <SearchIcon
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-shell-text-muted"
                />
                <input
                  id="invite_email"
                  type="email"
                  role="combobox"
                  aria-expanded={show_candidates}
                  aria-autocomplete="list"
                  required
                  autoFocus
                  autoComplete="off"
                  value={email}
                  onChange={(event) => handleEmailChange(event.target.value)}
                  onFocus={() => {
                    if (candidates.length > 0 || email.trim().length >= CANDIDATE_MIN_SEARCH_LENGTH) {
                      setShowCandidates(true);
                    }
                  }}
                  onBlur={() => window.setTimeout(() => setShowCandidates(false), 150)}
                  placeholder="Search by name or email…"
                  disabled={is_sending || send_success}
                  className="h-11 w-full rounded-lg border border-shell-border-strong bg-shell-bg pl-10 pr-4 text-sm text-shell-text placeholder:text-shell-text-muted outline-none focus:border-brand-400 disabled:opacity-60"
                />
              </div>

              {selected_candidate && (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-2">
                  <CreatorAvatar
                    initials={initialsFromName(selected_candidate.full_name)}
                    gradient_from={gradientForId(selected_candidate.id)[0]}
                    gradient_to={gradientForId(selected_candidate.id)[1]}
                    photo_url={selected_candidate.profile_photo_url}
                    title={selected_candidate.full_name}
                    size={22}
                  />
                  <span className="min-w-0 flex-1 text-xs">
                    <span className="block truncate font-medium text-shell-text">{selected_candidate.full_name}</span>
                  </span>
                  <CheckIcon size={14} className="flex-none text-brand-400" />
                </div>
              )}

              {show_candidates && (
                <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-shell-border-strong bg-shell-panel shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                  {is_searching_candidates ? (
                    <p className="px-4 py-3 text-xs text-shell-text-muted">Searching…</p>
                  ) : candidates.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-shell-text-muted">
                      No matching teammates — you can still invite this email address directly.
                    </p>
                  ) : (
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {candidates.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            // onMouseDown (not onClick) fires before the input's onBlur closes the list.
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectCandidate(candidate);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-shell-hover"
                          >
                            <CreatorAvatar
                              initials={initialsFromName(candidate.full_name)}
                              gradient_from={gradientForId(candidate.id)[0]}
                              gradient_to={gradientForId(candidate.id)[1]}
                              photo_url={candidate.profile_photo_url}
                              title={candidate.full_name}
                              size={26}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-shell-text">
                                {candidate.full_name}
                              </span>
                              <span className="block truncate text-xs text-shell-text-muted">{candidate.email}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
