"use client";

import React, { useEffect, useRef, useState } from "react";
import { invitationService } from "@/services/invitation.service";
import type { WorkspaceInvitationCandidate, WorkspaceMembershipRole } from "@/types/invitation";
import type { ApiError } from "@/types/auth";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { AlertCircleIcon, CheckIcon, CloseIcon, InviteIcon, SearchIcon } from "@/icons/workspace-icons";
import InvitationAvatar from "./InvitationAvatar";
import { WORKSPACE_ROLE_META } from "./InvitationRoleBadge";
import "./invitations.scss";

/** How long to wait after the last keystroke before searching the "pool of users". */
const CANDIDATE_SEARCH_DEBOUNCE_MS = 250;

/** Minimum characters typed before the "pool of users" autocomplete fires, mirrors the backend's own floor. */
const CANDIDATE_MIN_SEARCH_LENGTH = 2;

const ROLE_OPTIONS: ReadonlyArray<WorkspaceMembershipRole> = ["member", "viewer", "owner"];

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
 * "Invite member" dialog used by the "Sent invitations" page and Manage Workspace's
 * Collaborators tab: pick a known teammate or type any email, choose a role, then confirm
 * before the request fires. Styled with the shared `--inv-*` tokens in invitations.scss.
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

  const is_locked = is_sending || send_success;
  const role_meta = WORKSPACE_ROLE_META[role];

  return (
    <div className="invitations-theme inv-modal-root" role="dialog" aria-modal="true" aria-labelledby="send_invitation_title">
      <div className="inv-modal-backdrop" onClick={resetAndClose} aria-hidden="true" />

      <div className="inv-modal">
        <div className="inv-modal-header">
          <span className="inv-empty-icon !mb-0 !h-10 !w-10 flex-none">
            <InviteIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="send_invitation_title" className="font-heading text-dialog-title text-[var(--inv-text)]">
              Invite a team member
            </h2>
            <p className="inv-modal-subtitle">Search for someone already on the platform, or invite any email address.</p>
          </div>
          <PortalTooltip content="Close">
            <button type="button" aria-label="Close" onClick={resetAndClose} className="inv-icon-button">
              <CloseIcon size={16} />
            </button>
          </PortalTooltip>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="inv-modal-body space-y-5">
            {send_success ? (
              <div role="status" className="inv-notice !mb-0" data-tone="success">
                <CheckIcon size={16} />
                <span>Invitation sent. Closing this dialog.</span>
              </div>
            ) : null}
            {send_error ? (
              <div role="alert" className="inv-notice !mb-0" data-tone="danger">
                <AlertCircleIcon size={16} />
                <span>{send_error}</span>
              </div>
            ) : null}

            <div className="inv-combobox">
              <label htmlFor="invite_email" className="inv-label">
                Teammate or email address
              </label>
              <div className="inv-field w-full">
                <span className="inv-field-icon !left-3">
                  <SearchIcon size={15} />
                </span>
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
                  placeholder="Search by name or email"
                  disabled={is_locked}
                  className="inv-input disabled:opacity-60"
                />
              </div>

              {selected_candidate ? (
                <div className="inv-selected-person">
                  <InvitationAvatar
                    email={selected_candidate.email}
                    full_name={selected_candidate.full_name}
                    photo_url={selected_candidate.profile_photo_url}
                    size={24}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{selected_candidate.full_name}</span>
                  <PortalTooltip content="Already on the platform">
                    <CheckIcon size={14} className="flex-none text-[var(--inv-primary)]" />
                  </PortalTooltip>
                </div>
              ) : null}

              {show_candidates ? (
                <div className="inv-suggestions">
                  {is_searching_candidates ? (
                    <p>Searching teammates...</p>
                  ) : candidates.length === 0 ? (
                    <p>No matching teammates. You can still invite this email address directly.</p>
                  ) : (
                    <ul role="listbox">
                      {candidates.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            // onMouseDown (not onClick) fires before the input's onBlur closes the list.
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectCandidate(candidate);
                            }}
                            className="inv-suggestion"
                          >
                            <InvitationAvatar
                              email={candidate.email}
                              full_name={candidate.full_name}
                              photo_url={candidate.profile_photo_url}
                              size={28}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="inv-person-email">{candidate.full_name}</span>
                              <span className="inv-person-meta">{candidate.email}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <fieldset>
              <legend className="inv-label">Role</legend>
              <div className="inv-role-grid">
                {ROLE_OPTIONS.map((option) => {
                  const meta = WORKSPACE_ROLE_META[option];
                  const is_selected = role === option;
                  return (
                    <label key={option} className="inv-role-option" data-selected={is_selected ? "true" : "false"}>
                      <input
                        type="radio"
                        name="invite_role"
                        value={option}
                        checked={is_selected}
                        onChange={() => setRole(option)}
                        disabled={is_locked}
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
          </div>

          <div className="inv-modal-footer">
            <button type="button" onClick={resetAndClose} className="inv-button inv-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={is_locked} className="inv-button inv-button-primary">
              {is_sending ? <span className="inv-spinner" aria-hidden /> : null}
              {is_sending ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </form>
      </div>

      {show_confirm ? (
        <div className="inv-modal-root" data-layer="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm_invitation_title">
          <div className="inv-modal-backdrop" onClick={() => setShowConfirm(false)} aria-hidden="true" />
          <div className="inv-modal" data-size="sm">
            <div className="inv-modal-header">
              <div className="min-w-0 flex-1">
                <h3 id="confirm_invitation_title" className="font-heading text-dialog-title text-[var(--inv-text)]">
                  Send this invitation?
                </h3>
              </div>
            </div>
            <div className="inv-modal-body">
              <div className="inv-person">
                <InvitationAvatar email={email} full_name={selected_candidate?.full_name} photo_url={selected_candidate?.profile_photo_url} size={40} />
                <span className="min-w-0">
                  <span className="inv-person-email">{selected_candidate?.full_name ?? email}</span>
                  <span className="inv-person-meta">{email}</span>
                </span>
              </div>
              <p className="inv-summary">
                They will join this workspace as <strong>{role_meta.label}</strong>. {role_meta.hint} The link works for 7
                days.
              </p>
            </div>
            <div className="inv-modal-footer">
              <button type="button" onClick={() => setShowConfirm(false)} className="inv-button inv-button-secondary">
                Go back
              </button>
              <button type="button" onClick={handleConfirmSend} className="inv-button inv-button-primary">
                Yes, send invitation
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SendInvitationModal;
