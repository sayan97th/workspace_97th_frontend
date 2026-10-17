"use client";

import React, { useEffect, useRef, useState } from "react";
import { invitationService } from "@/services/invitation.service";
import type { WorkspaceInvitationCandidate, WorkspaceMembershipRole } from "@/types/invitation";
import type { ApiError } from "@/types/auth";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  InviteIcon,
  PencilIcon,
  SearchIcon,
} from "@/icons/workspace-icons";
import InvitationAvatar from "./InvitationAvatar";
import { WORKSPACE_ROLE_META } from "./InvitationRoleBadge";
import "./invitations.scss";

/** How long to wait after the last keystroke before searching the "pool of users". */
const CANDIDATE_SEARCH_DEBOUNCE_MS = 250;

/** Minimum characters typed before the "pool of users" autocomplete fires, mirrors the backend's own floor. */
const CANDIDATE_MIN_SEARCH_LENGTH = 2;

/** How long the success notice stays on screen before the dialog closes itself. */
const CLOSE_AFTER_SUCCESS_MS = 1800;

/** Days an invitation link stays valid, mirrors the API's expiry window. */
const INVITATION_VALID_DAYS = 7;

const ROLE_OPTIONS: ReadonlyArray<WorkspaceMembershipRole> = ["member", "viewer", "owner"];

type InviteStep = "details" | "review";

const INVITE_STEPS: ReadonlyArray<{ key: InviteStep; label: string }> = [
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

const STEP_COPY: Record<InviteStep, { title: string; subtitle: string }> = {
  details: {
    title: "Invite a team member",
    subtitle: "Search for someone already on the platform, or invite any email address.",
  },
  review: {
    title: "Send this invitation?",
    subtitle: "Check the details below. Go back if anything needs to change.",
  },
};

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
 * Collaborators tab. One dialog, two steps: "Details" (pick a known teammate or type any
 * email, choose a role) and "Review" (confirm before the request fires). Going back keeps
 * everything that was picked. Styled with the shared `--inv-*` tokens in invitations.scss.
 */
const SendInvitationModal: React.FC<SendInvitationModalProps> = ({ is_open, onClose, workspace_slug, onSent }) => {
  const [step, setStep] = useState<InviteStep>("details");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMembershipRole>("member");
  const [is_sending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_success, setSendSuccess] = useState(false);

  // "Pool of users" autocomplete: lets an owner/admin pick a known teammate
  // (e.g. Amanda) instead of having to know and type her exact email address.
  const [candidates, setCandidates] = useState<WorkspaceInvitationCandidate[]>([]);
  const [is_searching_candidates, setIsSearchingCandidates] = useState(false);
  const [show_candidates, setShowCandidates] = useState(false);
  const [selected_candidate, setSelectedCandidate] = useState<WorkspaceInvitationCandidate | null>(null);
  const search_debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search_request_id_ref = useRef(0);
  const close_timer_ref = useRef<number | null>(null);
  const review_heading_ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    return () => {
      if (search_debounce_ref.current) clearTimeout(search_debounce_ref.current);
      if (close_timer_ref.current) window.clearTimeout(close_timer_ref.current);
    };
  }, []);

  // Move focus to the review heading (not the Send button) so a second Enter
  // press right after "Continue" cannot send the invitation by accident.
  useEffect(() => {
    if (is_open && step === "review") review_heading_ref.current?.focus();
  }, [is_open, step]);

  const is_locked = is_sending || send_success;

  // Escape steps back from Review, otherwise closes the dialog. An open
  // suggestion list swallows the first Escape so it only closes the list.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || is_locked) return;
      event.preventDefault();
      if (show_candidates) setShowCandidates(false);
      else if (step === "review") setStep("details");
      else resetAndClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!is_open) return null;

  function resetAndClose() {
    if (close_timer_ref.current) window.clearTimeout(close_timer_ref.current);
    close_timer_ref.current = null;
    setStep("details");
    setEmail("");
    setRole("member");
    setSendError(null);
    setSendSuccess(false);
    setCandidates([]);
    setShowCandidates(false);
    setSelectedCandidate(null);
    onClose();
  }

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

  const goToDetails = () => {
    if (is_locked) return;
    setSendError(null);
    setStep("details");
  };

  const sendInvitation = async () => {
    setSendError(null);
    setIsSending(true);
    try {
      await invitationService.sendInvitation(workspace_slug, email.trim(), role);
      setSendSuccess(true);
      onSent();
      close_timer_ref.current = window.setTimeout(resetAndClose, CLOSE_AFTER_SUCCESS_MS);
    } catch (error) {
      setSendError(apiErrorMessage(error, "Failed to send invitation."));
    } finally {
      setIsSending(false);
    }
  };

  // Enter in the Details step only advances to Review, sending always needs the Review step.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (is_locked) return;
    if (step === "details") {
      setShowCandidates(false);
      setSendError(null);
      setStep("review");
      return;
    }
    void sendInvitation();
  };

  const role_meta = WORKSPACE_ROLE_META[role];
  const step_index = INVITE_STEPS.findIndex((item) => item.key === step);
  const step_copy = STEP_COPY[step];
  const display_name = selected_candidate?.full_name ?? email.trim();

  return (
    <div className="invitations-theme inv-modal-root" role="dialog" aria-modal="true" aria-labelledby="send_invitation_title">
      <div className="inv-modal-backdrop" onClick={is_locked ? undefined : resetAndClose} aria-hidden="true" />

      <div className="inv-modal" data-step={step}>
        <div className="inv-modal-header">
          <span className="inv-empty-icon !mb-0 !h-10 !w-10 flex-none">
            {step === "details" ? <InviteIcon size={18} /> : <CheckIcon size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="send_invitation_title"
              ref={review_heading_ref}
              tabIndex={-1}
              className="font-heading text-dialog-title text-[var(--inv-text)] outline-none"
            >
              {step_copy.title}
            </h2>
            <p className="inv-modal-subtitle">{step_copy.subtitle}</p>
          </div>
          <PortalTooltip content="Close">
            <button type="button" aria-label="Close" onClick={resetAndClose} disabled={is_locked} className="inv-icon-button">
              <CloseIcon size={16} />
            </button>
          </PortalTooltip>
        </div>

        <ol className="inv-stepper" aria-label="Invitation steps">
          {INVITE_STEPS.map((item, index) => {
            const state = index < step_index ? "done" : index === step_index ? "current" : "upcoming";
            const can_go_back = state === "done" && !is_locked;
            const marker = (
              <>
                <span className="inv-stepper-marker" aria-hidden>
                  {state === "done" ? <CheckIcon size={12} /> : index + 1}
                </span>
                <span className="inv-stepper-label">{item.label}</span>
              </>
            );
            return (
              <li key={item.key} className="inv-stepper-item" data-state={state} aria-current={state === "current" ? "step" : undefined}>
                {can_go_back ? (
                  <PortalTooltip content="Back to details">
                    <button type="button" onClick={goToDetails} className="inv-stepper-button">
                      {marker}
                    </button>
                  </PortalTooltip>
                ) : (
                  <span className="inv-stepper-button">{marker}</span>
                )}
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit}>
          <div key={step} className="inv-modal-body inv-step-panel space-y-5" data-step={step}>
            {step === "details" ? (
              <>
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
                      className="inv-input"
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
              </>
            ) : (
              <>
                {send_success ? (
                  <div role="status" className="inv-notice" data-tone="success">
                    <CheckIcon size={16} />
                    <span>Invitation sent. Closing this dialog.</span>
                  </div>
                ) : null}
                {send_error ? (
                  <div role="alert" className="inv-notice" data-tone="danger">
                    <AlertCircleIcon size={16} />
                    <span>{send_error}</span>
                  </div>
                ) : null}

                <dl className="inv-review-list">
                  <div className="inv-review-row">
                    <dt className="inv-review-term">Invitee</dt>
                    <dd className="inv-review-value">
                      <span className="inv-person">
                        <InvitationAvatar
                          email={email}
                          full_name={selected_candidate?.full_name}
                          photo_url={selected_candidate?.profile_photo_url}
                          size={36}
                        />
                        <span className="min-w-0">
                          <span className="inv-person-email">{display_name}</span>
                          <span className="inv-person-meta">
                            {selected_candidate ? `${email} · On the platform` : "New invitation by email"}
                          </span>
                        </span>
                      </span>
                      <PortalTooltip content="Change person">
                        <button type="button" aria-label="Change person" onClick={goToDetails} disabled={is_locked} className="inv-icon-button">
                          <PencilIcon size={15} />
                        </button>
                      </PortalTooltip>
                    </dd>
                  </div>

                  <div className="inv-review-row">
                    <dt className="inv-review-term">Role</dt>
                    <dd className="inv-review-value">
                      <span className="inv-person">
                        <span className="inv-role-option-icon" data-tone="primary">
                          <role_meta.Icon size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="inv-person-email">{role_meta.label}</span>
                          <span className="inv-review-hint">{role_meta.hint}</span>
                        </span>
                      </span>
                      <PortalTooltip content="Change role">
                        <button type="button" aria-label="Change role" onClick={goToDetails} disabled={is_locked} className="inv-icon-button">
                          <PencilIcon size={15} />
                        </button>
                      </PortalTooltip>
                    </dd>
                  </div>
                </dl>

                <p className="inv-summary !mt-4">
                  They will get an email to join this workspace as <strong>{role_meta.label}</strong>. The link works for{" "}
                  {INVITATION_VALID_DAYS} days.
                </p>
              </>
            )}
          </div>

          <div className="inv-modal-footer">
            {step === "details" ? (
              <>
                <button type="button" onClick={resetAndClose} className="inv-button inv-button-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={email.trim().length === 0} className="inv-button inv-button-primary">
                  Continue
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={goToDetails} disabled={is_locked} className="inv-button inv-button-secondary mr-auto">
                  <ChevronLeftIcon size={12} />
                  Back
                </button>
                <button type="button" onClick={resetAndClose} disabled={is_locked} className="inv-button inv-button-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={is_locked} className="inv-button inv-button-primary">
                  {is_sending ? <span className="inv-spinner" aria-hidden /> : null}
                  {is_sending ? "Sending..." : send_success ? "Sent" : "Send invitation"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendInvitationModal;
