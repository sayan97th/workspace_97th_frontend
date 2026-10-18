"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  invite_default_role,
  invite_message_placeholder,
  invite_roles,
  type InviteRoleId,
} from "@/data/invite-members-data";
import type { ApiError } from "@/types/auth";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CrownIcon,
  EyeIcon,
  InfoIcon,
  InviteIcon,
  MemberIcon,
  PlusIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import InviteRecipientsField from "./InviteRecipientsField";
import InviteLinkPanel from "./InviteLinkPanel";
import InviteResultList, { type InviteMembersResult } from "./InviteResultList";
import {
  MAX_INVITE_MESSAGE_LENGTH,
  MAX_INVITE_RECIPIENTS,
  mergeRecipients,
  peopleCount,
  type InviteRecipient,
} from "./inviteRecipients";
import "../invitations.scss";
import "./invite-members.scss";

export type { InviteMembersResult } from "./InviteResultList";

export type InviteMembersSubmission = {
  /** Valid, deduped addresses from the chips. */
  emails: string[];
  role: InviteRoleId;
  message: string;
};

export type InviteMembersModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Active workspace, loads the shareable link and scopes "View sent invitations". */
  workspace_slug?: string;
  workspace_name?: string;
  onSubmit: (submission: InviteMembersSubmission) => Promise<InviteMembersResult>;
};

/** Same layer the old dialog used, above the top bar, sidebar and drawers. */
const MODAL_Z_INDEX = 400;

/** How long the "added / skipped" note under the field stays visible. */
const FIELD_NOTE_MS = 3500;

const ROLE_ICONS: Record<InviteRoleId, IconComponent> = {
  viewer: EyeIcon,
  member: MemberIcon,
  admin: CrownIcon,
};

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

/**
 * "Invite members" dialog opened from the top bar. Invite by email (chips with teammate
 * suggestions, a role and an optional note) or share the workspace link, then a per address
 * summary of what was sent. Styled with the shared `--inv-*` tokens, so it matches the
 * Invitations pages and the other invite dialogs in light and dark mode.
 */
const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  is_open,
  onClose,
  workspace_slug,
  workspace_name,
  onSubmit,
}) => {
  const router = useRouter();
  const title_id = useId();
  const field_hint_id = useId();
  const message_id = useId();
  const [recipients, setRecipients] = useState<InviteRecipient[]>([]);
  const [role, setRole] = useState<InviteRoleId>(invite_default_role);
  const [is_message_open, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [field_note, setFieldNote] = useState<string | null>(null);
  const [result, setResult] = useState<InviteMembersResult | null>(null);
  const [sent_recipients, setSentRecipients] = useState<InviteRecipient[]>([]);
  const [form_key, setFormKey] = useState(0);
  const note_timer_ref = useRef<number | null>(null);
  const message_ref = useRef<HTMLTextAreaElement | null>(null);
  const opener_ref = useRef<HTMLElement | null>(null);
  const submit_button_ref = useRef<HTMLButtonElement | null>(null);

  const resetForm = (keep_role: boolean) => {
    setRecipients([]);
    if (!keep_role) setRole(invite_default_role);
    setIsMessageOpen(false);
    setMessage("");
    setSubmitError(null);
    setFieldNote(null);
    setResult(null);
    setSentRecipients([]);
    // Remounts the field so its draft and suggestions start empty too.
    setFormKey((previous) => previous + 1);
  };

  // Start fresh every time the dialog opens, and give focus back to the opener when it closes.
  useEffect(() => {
    if (!is_open) return;
    opener_ref.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    resetForm(false);
    setIsSubmitting(false);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous_overflow;
      opener_ref.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm only sets state.
  }, [is_open]);

  useEffect(() => {
    return () => {
      if (note_timer_ref.current) window.clearTimeout(note_timer_ref.current);
    };
  }, []);

  useEffect(() => {
    if (is_message_open) message_ref.current?.focus();
  }, [is_message_open]);

  const valid_recipients = recipients.filter((recipient) => recipient.is_valid);
  const invalid_count = recipients.length - valid_recipients.length;
  const can_submit = valid_recipients.length > 0 && invalid_count === 0 && !is_submitting && Boolean(workspace_slug);
  const send_blocker = !workspace_slug
    ? "Pick a workspace first"
    : recipients.length === 0
      ? "Add at least one person"
      : invalid_count > 0
        ? "Fix or remove the invalid addresses first"
        : null;

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const submission_result = await onSubmit({
        emails: valid_recipients.map((recipient) => recipient.email),
        role,
        message: message.trim(),
      });
      setSentRecipients(valid_recipients);
      setResult(submission_result);
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "We couldn't send those invitations. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Escape closes (the suggestion list swallows it first), Ctrl or Cmd + Enter sends.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_submitting) {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !result) {
        event.preventDefault();
        // Blurring commits a half typed address first, the click then runs with the updated list.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.setTimeout(() => submit_button_ref.current?.click(), 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!is_open) return null;

  const showFieldNote = (note: string) => {
    setFieldNote(note);
    if (note_timer_ref.current) window.clearTimeout(note_timer_ref.current);
    note_timer_ref.current = window.setTimeout(() => setFieldNote(null), FIELD_NOTE_MS);
  };

  const addRecipients = (incoming: InviteRecipient[]) => {
    setSubmitError(null);
    const merged = mergeRecipients(recipients, incoming);
    setRecipients(merged.recipients);
    const notes = [
      merged.duplicate_count > 0 ? `${peopleCount(merged.duplicate_count)} already in the list` : null,
      merged.overflow_count > 0 ? `${peopleCount(merged.overflow_count)} left out, the limit is ${MAX_INVITE_RECIPIENTS} per send` : null,
    ].filter(Boolean);
    if (notes.length > 0) showFieldNote(`${notes.join(". ")}.`);
  };

  const removeRecipient = (key: string) => setRecipients((current) => current.filter((recipient) => recipient.key !== key));

  const removeInvalid = () => setRecipients((current) => current.filter((recipient) => recipient.is_valid));

  const openSentInvitations = () => {
    onClose();
    router.push(workspace_slug ? `/invitations?workspace=${workspace_slug}` : "/invitations");
  };

  const shortcut_label = isMacPlatform() ? "⌘ + Enter" : "Ctrl + Enter";
  const invited_count = result?.invited_emails.length ?? 0;
  const title = result
    ? invited_count > 0
      ? invited_count === 1
        ? "Invitation sent"
        : `${invited_count} invitations sent`
      : "No invitations sent"
    : workspace_name
      ? `Invite to ${workspace_name}`
      : "Invite members";
  const subtitle = result
    ? "Here is what happened with each address."
    : "Add teammates by name or email, or share the workspace link.";

  return (
    <div
      className="invitations-theme inv-modal-root"
      style={{ zIndex: MODAL_Z_INDEX }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title_id}
    >
      <div className="inv-modal-backdrop" onClick={is_submitting ? undefined : onClose} aria-hidden="true" />

      <div className="inv-modal inv-invite-modal" data-view={result ? "result" : "form"}>
        <div className="inv-modal-header">
          <span className="inv-empty-icon !mb-0 !h-10 !w-10 flex-none" data-tone={result ? "success" : undefined}>
            {result ? <CheckIcon size={18} /> : <InviteIcon size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={title_id} className="font-heading text-dialog-title truncate text-[var(--inv-text)]">
              {title}
            </h2>
            <p className="inv-modal-subtitle">{subtitle}</p>
          </div>
          <PortalTooltip content="Close">
            <button type="button" aria-label="Close" onClick={onClose} disabled={is_submitting} className="inv-icon-button">
              <CloseIcon size={16} />
            </button>
          </PortalTooltip>
        </div>

        {result ? (
          <div key="result" className="inv-modal-body inv-step-panel inv-invite-body" data-step="review">
            <InviteResultList result={result} recipients={sent_recipients} />
          </div>
        ) : (
          <div key="form" className="inv-modal-body inv-invite-body">
            <section className="inv-invite-section" aria-label="Invite with email">
              <div className="inv-invite-label-row">
                <label htmlFor={`invite_recipients_${form_key}`} className="inv-label !mb-0">
                  Invite with email
                </label>
                <PortalTooltip content={`Up to ${MAX_INVITE_RECIPIENTS} people per send`}>
                  <span className="inv-invite-counter" tabIndex={0} data-full={recipients.length >= MAX_INVITE_RECIPIENTS ? "true" : "false"}>
                    {recipients.length}/{MAX_INVITE_RECIPIENTS}
                  </span>
                </PortalTooltip>
              </div>

              <InviteRecipientsField
                key={form_key}
                id={`invite_recipients_${form_key}`}
                recipients={recipients}
                onAdd={addRecipients}
                onRemove={removeRecipient}
                workspace_slug={workspace_slug}
                disabled={is_submitting}
                described_by={field_hint_id}
              />

              <div id={field_hint_id} className="inv-invite-hint" aria-live="polite">
                {invalid_count > 0 ? (
                  <span className="inv-invite-hint-error">
                    <AlertCircleIcon size={13} />
                    {invalid_count === 1 ? "1 address is not valid." : `${invalid_count} addresses are not valid.`}
                    <button type="button" className="inv-text-button" data-tone="danger" onClick={removeInvalid}>
                      Remove {invalid_count === 1 ? "it" : "them"}
                    </button>
                  </span>
                ) : field_note ? (
                  <span>{field_note}</span>
                ) : (
                  <span>Press Enter, comma or space after each address. You can paste a whole list.</span>
                )}
              </div>
            </section>

            <fieldset className="inv-invite-section">
              <legend className="inv-invite-legend">
                <span className="inv-label !mb-0">Invite as</span>
                <PortalTooltip content="You can change anyone's role later in Manage Workspace.">
                  <span className="inv-link-info" tabIndex={0} aria-label="You can change anyone's role later in Manage Workspace.">
                    <InfoIcon size={13} />
                  </span>
                </PortalTooltip>
              </legend>
              <div className="inv-role-grid inv-invite-roles">
                {invite_roles.map((option) => {
                  const RoleIcon = ROLE_ICONS[option.id];
                  const is_selected = role === option.id;
                  return (
                    <label key={option.id} className="inv-role-option" data-selected={is_selected ? "true" : "false"}>
                      <input
                        type="radio"
                        name="invite_members_role"
                        value={option.id}
                        checked={is_selected}
                        onChange={() => setRole(option.id)}
                        disabled={is_submitting}
                        className="sr-only"
                      />
                      <span className="inv-role-option-icon">
                        <RoleIcon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="inv-role-option-label block">{option.label}</span>
                        <span className="inv-role-option-hint block">{option.description}</span>
                      </span>
                      {is_selected ? (
                        <span className="inv-role-option-check" aria-hidden>
                          <CheckIcon size={10} />
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="inv-invite-section">
              {is_message_open ? (
                <>
                  <div className="inv-invite-label-row">
                    <label htmlFor={message_id} className="inv-label !mb-0">
                      Personal message <span className="inv-muted font-normal">(optional)</span>
                    </label>
                    <PortalTooltip content="Remove the message">
                      <button
                        type="button"
                        className="inv-text-button"
                        onClick={() => {
                          setMessage("");
                          setIsMessageOpen(false);
                        }}
                      >
                        Remove
                      </button>
                    </PortalTooltip>
                  </div>
                  <textarea
                    ref={message_ref}
                    id={message_id}
                    value={message}
                    maxLength={MAX_INVITE_MESSAGE_LENGTH}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={invite_message_placeholder}
                    rows={3}
                    disabled={is_submitting}
                    className="inv-input inv-textarea"
                  />
                  <div className="inv-invite-hint">
                    <span>Shown in the invitation email.</span>
                    <span className="ml-auto tabular-nums">
                      {message.length}/{MAX_INVITE_MESSAGE_LENGTH}
                    </span>
                  </div>
                </>
              ) : (
                <button type="button" className="inv-add-message" onClick={() => setIsMessageOpen(true)} disabled={is_submitting}>
                  <PlusIcon size={13} />
                  Add a personal message
                </button>
              )}
            </div>

            {submit_error ? (
              <div role="alert" className="inv-notice !mb-0" data-tone="danger">
                <AlertCircleIcon size={16} />
                <span>{submit_error}</span>
              </div>
            ) : null}

            <div className="inv-invite-divider" role="separator">
              <span>or</span>
            </div>

            <InviteLinkPanel workspace_slug={workspace_slug} />
          </div>
        )}

        <div className="inv-modal-footer inv-invite-footer">
          <button type="button" onClick={openSentInvitations} className="inv-button inv-button-ghost inv-invite-sent-link">
            View sent invitations
            <ChevronRightIcon size={10} />
          </button>

          {result ? (
            <>
              <button type="button" onClick={() => resetForm(true)} className="inv-button inv-button-secondary">
                Invite more people
              </button>
              <button type="button" onClick={onClose} className="inv-button inv-button-primary">
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={is_submitting} className="inv-button inv-button-secondary">
                Cancel
              </button>
              <PortalTooltip content={send_blocker ?? `Send (${shortcut_label})`}>
                <button
                  ref={submit_button_ref}
                  type="button"
                  onClick={() => void handleSubmit()}
                  aria-disabled={!can_submit}
                  data-disabled={!can_submit ? "true" : "false"}
                  className="inv-button inv-button-primary"
                >
                  {is_submitting ? <span className="inv-spinner" aria-hidden /> : null}
                  {is_submitting
                    ? "Sending..."
                    : valid_recipients.length > 1
                      ? `Send ${valid_recipients.length} invitations`
                      : "Send invitation"}
                </button>
              </PortalTooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;
