"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { invitationService } from "@/services/invitation.service";
import type { ApiError } from "@/types/auth";
import type { WorkspaceInvitationCandidate } from "@/types/invitation";
import { AlertCircleIcon, ClockIcon, CloseIcon, MailIcon, PlusIcon } from "@/icons/workspace-icons";
import InvitationAvatar from "../InvitationAvatar";
import InvitationPill from "../InvitationPill";
import {
  isValidInviteEmail,
  MAX_INVITE_RECIPIENTS,
  RECIPIENT_SEPARATOR_PATTERN,
  recipientFromCandidate,
  recipientFromEmail,
  recipientLabel,
  splitRecipientText,
  type InviteRecipient,
} from "./inviteRecipients";

/** How long to wait after the last keystroke before searching the "pool of users". */
const SEARCH_DEBOUNCE_MS = 250;

/** Mirrors the API's minimum search length for `available-users`. */
const MIN_SEARCH_LENGTH = 2;

/** One row of the suggestion list: a known teammate, or "Invite this address" for a typed email. */
type SuggestionOption =
  | { kind: "candidate"; candidate: WorkspaceInvitationCandidate }
  | { kind: "email"; email: string };

export type InviteRecipientsFieldProps = {
  id: string;
  recipients: InviteRecipient[];
  /** Adds the given addresses, the parent dedupes and caps them. */
  onAdd: (recipients: InviteRecipient[]) => void;
  onRemove: (key: string) => void;
  workspace_slug?: string;
  disabled?: boolean;
  /** Error or hint ids the input should be described by. */
  described_by?: string;
};

/**
 * monday style "Invite with email" field: every address becomes a chip (with the person's photo
 * and name when they were picked from the suggestions), typed text commits on Enter, Tab, comma,
 * space or paste, and Backspace on an empty draft removes the last chip. Suggestions come from the
 * workspace's "pool of users" endpoint, people who cannot see it (403) just get the
 * "Invite this address" row.
 */
const InviteRecipientsField: React.FC<InviteRecipientsFieldProps> = ({
  id,
  recipients,
  onAdd,
  onRemove,
  workspace_slug,
  disabled = false,
  described_by,
}) => {
  const listbox_id = useId();
  const input_ref = useRef<HTMLInputElement | null>(null);
  const debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request_id_ref = useRef(0);
  const [draft, setDraft] = useState("");
  const [candidates, setCandidates] = useState<WorkspaceInvitationCandidate[]>([]);
  const [is_searching, setIsSearching] = useState(false);
  const [can_search_people, setCanSearchPeople] = useState(true);
  const [is_suggestions_open, setIsSuggestionsOpen] = useState(false);
  const [highlighted_index, setHighlightedIndex] = useState(0);

  useEffect(() => {
    return () => {
      if (debounce_ref.current) clearTimeout(debounce_ref.current);
    };
  }, []);

  const is_full = recipients.length >= MAX_INVITE_RECIPIENTS;
  const draft_value = draft.trim();
  const picked_keys = new Set(recipients.map((recipient) => recipient.key));
  const visible_candidates = candidates.filter((candidate) => !picked_keys.has(candidate.email.toLowerCase()));
  const draft_matches_candidate = visible_candidates.some(
    (candidate) => candidate.email.toLowerCase() === draft_value.toLowerCase()
  );
  const options: SuggestionOption[] = [
    ...visible_candidates.map((candidate) => ({ kind: "candidate" as const, candidate })),
    ...(isValidInviteEmail(draft_value) && !draft_matches_candidate && !picked_keys.has(draft_value.toLowerCase())
      ? [{ kind: "email" as const, email: draft_value }]
      : []),
  ];
  const show_suggestions = is_suggestions_open && draft_value.length >= MIN_SEARCH_LENGTH && (options.length > 0 || is_searching);
  const active_index = Math.min(highlighted_index, Math.max(options.length - 1, 0));

  const resetSearch = () => {
    if (debounce_ref.current) clearTimeout(debounce_ref.current);
    request_id_ref.current += 1;
    setCandidates([]);
    setIsSearching(false);
    setIsSuggestionsOpen(false);
    setHighlightedIndex(0);
  };

  const searchPeople = (term: string) => {
    if (debounce_ref.current) clearTimeout(debounce_ref.current);
    if (!workspace_slug || !can_search_people || term.length < MIN_SEARCH_LENGTH) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const request_id = ++request_id_ref.current;
    debounce_ref.current = setTimeout(async () => {
      try {
        const results = await invitationService.searchAvailableUsers(workspace_slug, term);
        if (request_id === request_id_ref.current) setCandidates(results);
      } catch (error) {
        if (request_id !== request_id_ref.current) return;
        setCandidates([]);
        // Only owners and admins can browse the pool of users, everyone else just types addresses.
        if ((error as ApiError)?.status_code === 403) setCanSearchPeople(false);
      } finally {
        if (request_id === request_id_ref.current) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const commitText = (text: string) => {
    const addresses = splitRecipientText(text);
    if (addresses.length > 0) onAdd(addresses.map(recipientFromEmail));
  };

  const commitDraft = () => {
    if (!draft_value) return;
    commitText(draft_value);
    setDraft("");
    resetSearch();
  };

  const pickOption = (option: SuggestionOption) => {
    onAdd([option.kind === "candidate" ? recipientFromCandidate(option.candidate) : recipientFromEmail(option.email)]);
    setDraft("");
    resetSearch();
    input_ref.current?.focus();
  };

  const handleDraftChange = (value: string) => {
    // A separator commits everything before it and keeps typing on the rest.
    if (RECIPIENT_SEPARATOR_PATTERN.test(value)) {
      const parts = value.split(RECIPIENT_SEPARATOR_PATTERN);
      const remainder = parts.pop() ?? "";
      commitText(parts.join(" "));
      setDraft(remainder);
      if (remainder.trim().length >= MIN_SEARCH_LENGTH) {
        setIsSuggestionsOpen(true);
        searchPeople(remainder.trim());
      } else {
        resetSearch();
      }
      return;
    }

    setDraft(value);
    setHighlightedIndex(0);
    setIsSuggestionsOpen(true);
    searchPeople(value.trim());
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!RECIPIENT_SEPARATOR_PATTERN.test(text.trim()) && !text.includes("<")) return;
    event.preventDefault();
    commitText(`${draft} ${text}`);
    setDraft("");
    resetSearch();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && show_suggestions) {
      event.preventDefault();
      setHighlightedIndex((active_index + 1) % Math.max(options.length, 1));
      return;
    }
    if (event.key === "ArrowUp" && show_suggestions) {
      event.preventDefault();
      setHighlightedIndex((active_index - 1 + options.length) % Math.max(options.length, 1));
      return;
    }
    if (event.key === "Escape" && show_suggestions) {
      // Only closes the list, the dialog's own Escape handler must not fire.
      event.preventDefault();
      event.stopPropagation();
      setIsSuggestionsOpen(false);
      return;
    }
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      if (show_suggestions && options[active_index]) {
        event.preventDefault();
        pickOption(options[active_index]);
        return;
      }
      if (draft_value) {
        event.preventDefault();
        commitDraft();
      }
      return;
    }
    if (event.key === "Tab" && draft_value) {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && recipients.length > 0) {
      event.preventDefault();
      onRemove(recipients[recipients.length - 1].key);
    }
  };

  /** Puts an invalid address back into the draft so it can be fixed. */
  const editRecipient = (recipient: InviteRecipient) => {
    onRemove(recipient.key);
    setDraft(recipient.email);
    window.requestAnimationFrame(() => input_ref.current?.focus());
  };

  return (
    <div className="inv-recipients">
      <div
        className="inv-recipients-box"
        data-disabled={disabled ? "true" : "false"}
        data-invalid={recipients.some((recipient) => !recipient.is_valid) ? "true" : "false"}
        onMouseDown={(event) => {
          // Clicking the empty area of the box focuses the input, like a real text field.
          if (event.target === event.currentTarget) {
            event.preventDefault();
            input_ref.current?.focus();
          }
        }}
      >
        {recipients.map((recipient) => {
          const tone = !recipient.is_valid ? "danger" : recipient.has_pending_invitation ? "warning" : "neutral";
          const tooltip = !recipient.is_valid
            ? "Not a valid email. Click to edit."
            : recipient.has_pending_invitation
              ? "Already invited. Sending again resends the invitation."
              : recipient.full_name
                ? recipient.email
                : "New invitation by email";
          return (
            <span key={recipient.key} className="inv-chip" data-tone={tone}>
              <PortalTooltip content={tooltip}>
                <button
                  type="button"
                  className="inv-chip-main"
                  onClick={recipient.is_valid ? undefined : () => editRecipient(recipient)}
                  disabled={disabled}
                  aria-label={recipient.is_valid ? recipientLabel(recipient) : `Edit ${recipient.email}, not a valid email address`}
                  data-editable={recipient.is_valid ? "false" : "true"}
                >
                  {recipient.is_valid ? (
                    <InvitationAvatar
                      email={recipient.email}
                      full_name={recipient.full_name}
                      photo_url={recipient.photo_url}
                      size={20}
                    />
                  ) : (
                    <AlertCircleIcon size={14} className="inv-chip-alert" />
                  )}
                  <span className="inv-chip-label">{recipient.full_name ?? recipient.email}</span>
                  {recipient.has_pending_invitation && recipient.is_valid ? <ClockIcon size={12} className="inv-chip-alert" /> : null}
                </button>
              </PortalTooltip>
              <PortalTooltip content="Remove">
                <button
                  type="button"
                  className="inv-chip-remove"
                  onClick={() => onRemove(recipient.key)}
                  disabled={disabled}
                  aria-label={`Remove ${recipient.email}`}
                >
                  <CloseIcon size={10} />
                </button>
              </PortalTooltip>
            </span>
          );
        })}

        <input
          ref={input_ref}
          id={id}
          type="text"
          inputMode="email"
          role="combobox"
          aria-expanded={show_suggestions}
          aria-controls={listbox_id}
          aria-autocomplete="list"
          aria-activedescendant={show_suggestions && options[active_index] ? `${listbox_id}-${active_index}` : undefined}
          aria-describedby={described_by}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          value={draft}
          disabled={disabled || is_full}
          onChange={(event) => handleDraftChange(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (draft_value.length >= MIN_SEARCH_LENGTH) setIsSuggestionsOpen(true);
          }}
          onBlur={() => {
            setIsSuggestionsOpen(false);
            commitDraft();
          }}
          placeholder={
            is_full
              ? `Up to ${MAX_INVITE_RECIPIENTS} people per send`
              : recipients.length > 0
                ? "Add more people"
                : can_search_people
                  ? "Search by name, or type email addresses"
                  : "Type email addresses"
          }
          className="inv-recipients-input"
        />
      </div>

      {show_suggestions ? (
        <div className="inv-suggestions">
          {is_searching && options.length === 0 ? (
            <p>Searching teammates...</p>
          ) : (
            <ul role="listbox" id={listbox_id} aria-label="Suggested people">
              {options.map((option, index) => {
                const is_active = index === active_index;
                const option_id = `${listbox_id}-${index}`;
                const handleMouseDown = (event: React.MouseEvent) => {
                  // onMouseDown (not onClick) fires before the input's onBlur commits the draft.
                  event.preventDefault();
                  pickOption(option);
                };

                if (option.kind === "email") {
                  return (
                    <li key="email" id={option_id} role="option" aria-selected={is_active}>
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={handleMouseDown}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className="inv-suggestion"
                        data-active={is_active ? "true" : "false"}
                      >
                        <span className="inv-suggestion-icon">
                          <MailIcon size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="inv-person-email">Invite {option.email}</span>
                          <span className="inv-person-meta">Sends a new invitation by email</span>
                        </span>
                        <PlusIcon size={14} className="inv-suggestion-trailing" />
                      </button>
                    </li>
                  );
                }

                const { candidate } = option;
                return (
                  <li key={candidate.id} id={option_id} role="option" aria-selected={is_active}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={handleMouseDown}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className="inv-suggestion"
                      data-active={is_active ? "true" : "false"}
                    >
                      <InvitationAvatar
                        email={candidate.email}
                        full_name={candidate.full_name}
                        photo_url={candidate.profile_photo_url}
                        size={30}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="inv-person-email">{recipientLabel(candidate)}</span>
                        <span className="inv-person-meta">{candidate.email}</span>
                      </span>
                      {candidate.has_pending_invitation ? (
                        <InvitationPill
                          tone="warning"
                          icon={<ClockIcon size={11} />}
                          tooltip="Already has an open invitation. Adding them resends it."
                        >
                          Invited
                        </InvitationPill>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default InviteRecipientsField;
