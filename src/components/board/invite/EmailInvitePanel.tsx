"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Clock, LayoutGrid, LogIn, Mail, MailPlus, MessageSquarePlus, Plus, Send, UserCheck, X } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import {
  isValidInviteEmail,
  MAX_INVITE_MESSAGE_LENGTH,
  MAX_INVITE_RECIPIENTS,
  RECIPIENT_SEPARATOR_PATTERN,
  splitRecipientText,
} from "@/components/invitations/invite-members/inviteRecipients";
import type { WorkspaceMember } from "@/types/workspace";
import { peopleLabel } from "./boardInviteUtils";

const MAX_SUGGESTIONS = 6;

/** How a typed address will be handled once sent. */
type ChipKind = "invalid" | "on_board" | "member" | "pending" | "new";

const CHIP_COPY: Record<ChipKind, { tone: string; hint: string }> = {
  invalid: { tone: "danger", hint: "Not a valid email address. Click to edit it." },
  on_board: { tone: "success", hint: "Already on this board, it will be skipped." },
  member: { tone: "brand", hint: "Workspace member, gets access right away." },
  pending: { tone: "warning", hint: "Already invited. Sending again resends the email." },
  new: { tone: "neutral", hint: "Gets an email to create an account and open this board." },
};

type Suggestion = { kind: "member"; member: WorkspaceMember } | { kind: "email"; email: string };

export type EmailInviteSubmission = {
  /** Workspace members typed by email, added right away without an email. */
  member_ids: number[];
  /** Everyone else, invited by email. */
  emails: string[];
  message: string;
};

export type EmailInvitePanelProps = {
  members: WorkspaceMember[];
  /** Lowercased emails of people already added to the board. */
  added_emails: Set<string>;
  /** Lowercased emails with a pending invitation. */
  pending_emails: Set<string>;
  is_busy: boolean;
  /** Resolves true when everything went out, so the field clears. */
  onSend: (submission: EmailInviteSubmission) => Promise<boolean>;
};

/**
 * "Invite by email" tab of the board invite dialog. Explains in three steps what happens to
 * someone without an account (email, sign up or sign in, land on the board), then takes any
 * number of addresses as chips. Each chip is colored by what will happen to it: workspace members
 * are added right away, new people get an email, pending invites are resent and people already
 * on the board are skipped.
 */
const EmailInvitePanel: React.FC<EmailInvitePanelProps> = ({ members, added_emails, pending_emails, is_busy, onSend }) => {
  const field_id = useId();
  const message_id = useId();
  const listbox_id = useId();
  const input_ref = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [is_message_open, setIsMessageOpen] = useState(false);
  const [is_suggestions_open, setIsSuggestionsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(0);

  const member_by_email = useMemo(() => new Map(members.map((member) => [member.email.toLowerCase(), member])), [members]);

  const kindOf = (email: string): ChipKind => {
    const key = email.toLowerCase();
    if (!isValidInviteEmail(email)) return "invalid";
    if (added_emails.has(key)) return "on_board";
    if (member_by_email.has(key)) return "member";
    if (pending_emails.has(key)) return "pending";
    return "new";
  };

  const chip_kinds = emails.map(kindOf);
  const invalid_count = chip_kinds.filter((kind) => kind === "invalid").length;
  const member_count = chip_kinds.filter((kind) => kind === "member").length;
  const invite_count = chip_kinds.filter((kind) => kind === "new" || kind === "pending").length;
  const is_full = emails.length >= MAX_INVITE_RECIPIENTS;

  const draft_value = draft.trim();
  const needle = draft_value.toLowerCase();
  const picked = useMemo(() => new Set(emails.map((email) => email.toLowerCase())), [emails]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!needle) return [];
    const found: Suggestion[] = members
      .filter((member) => !picked.has(member.email.toLowerCase()) && !added_emails.has(member.email.toLowerCase()))
      .filter((member) => member.full_name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle))
      .slice(0, MAX_SUGGESTIONS)
      .map((member) => ({ kind: "member", member }));
    if (isValidInviteEmail(draft_value) && !member_by_email.has(needle) && !picked.has(needle)) {
      found.push({ kind: "email", email: draft_value });
    }
    return found;
  }, [needle, draft_value, members, picked, added_emails, member_by_email]);

  const show_suggestions = is_suggestions_open && suggestions.length > 0;
  const current_index = Math.min(active_index, Math.max(suggestions.length - 1, 0));

  const addEmails = (incoming: string[]) => {
    setEmails((current) => {
      const next = [...current];
      const seen = new Set(current.map((email) => email.toLowerCase()));
      incoming.forEach((email) => {
        const key = email.toLowerCase();
        if (seen.has(key) || next.length >= MAX_INVITE_RECIPIENTS) return;
        seen.add(key);
        next.push(email);
      });
      return next;
    });
  };

  const removeEmail = (email: string) => setEmails((current) => current.filter((value) => value !== email));

  const commitText = (text: string) => {
    const addresses = splitRecipientText(text);
    if (addresses.length > 0) addEmails(addresses);
  };

  const commitDraft = () => {
    if (!draft_value) return;
    commitText(draft_value);
    setDraft("");
    setIsSuggestionsOpen(false);
  };

  const pickSuggestion = (suggestion: Suggestion) => {
    addEmails([suggestion.kind === "member" ? suggestion.member.email : suggestion.email]);
    setDraft("");
    setIsSuggestionsOpen(false);
    input_ref.current?.focus();
  };

  const handleDraftChange = (value: string) => {
    // A separator commits everything typed before it.
    if (RECIPIENT_SEPARATOR_PATTERN.test(value)) {
      const parts = value.split(RECIPIENT_SEPARATOR_PATTERN);
      const remainder = parts.pop() ?? "";
      commitText(parts.join(" "));
      setDraft(remainder);
    } else {
      setDraft(value);
    }
    setActiveIndex(0);
    setIsSuggestionsOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (show_suggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current_index + step + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Escape" && show_suggestions) {
      // Only closes the list, the dialog's own Escape handler must not fire.
      event.preventDefault();
      event.stopPropagation();
      setIsSuggestionsOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (show_suggestions && suggestions[current_index]) pickSuggestion(suggestions[current_index]);
      else commitDraft();
      return;
    }
    if (event.key === "Tab" && draft_value) {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && emails.length > 0) {
      event.preventDefault();
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!RECIPIENT_SEPARATOR_PATTERN.test(text.trim()) && !text.includes("<")) return;
    event.preventDefault();
    commitText(`${draft} ${text}`);
    setDraft("");
  };

  /** Puts an invalid address back into the draft so it can be fixed. */
  const editEmail = (email: string) => {
    removeEmail(email);
    setDraft(email);
    window.requestAnimationFrame(() => input_ref.current?.focus());
  };

  const can_send = !is_busy && invalid_count === 0 && member_count + invite_count > 0;

  const submit = async () => {
    if (!can_send) return;
    const member_ids: number[] = [];
    const invite_emails: string[] = [];
    emails.forEach((email, index) => {
      const kind = chip_kinds[index];
      if (kind === "member") {
        const member = member_by_email.get(email.toLowerCase());
        if (member) member_ids.push(member.id);
      } else if (kind === "new" || kind === "pending") {
        invite_emails.push(email);
      }
    });
    const was_sent = await onSend({ member_ids, emails: invite_emails, message: message.trim() });
    if (was_sent) {
      setEmails([]);
      setDraft("");
      setMessage("");
      setIsMessageOpen(false);
    }
  };

  const send_label =
    member_count > 0 && invite_count > 0
      ? `Add ${member_count}, invite ${invite_count}`
      : member_count > 0
        ? `Add ${peopleLabel(member_count)}`
        : invite_count > 1
          ? `Send ${invite_count} invitations`
          : "Send invitation";

  const legend = (
    [
      ["member", member_count, `${peopleLabel(member_count)} added right away`],
      ["neutral", invite_count, `${peopleLabel(invite_count)} invited by email`],
      ["success", chip_kinds.filter((kind) => kind === "on_board").length, "already on the board"],
      ["danger", invalid_count, invalid_count === 1 ? "invalid address" : "invalid addresses"],
    ] as const
  ).filter(([, count]) => count > 0);

  return (
    <div className="binv-panel" role="tabpanel" id="binv-panel-email" aria-labelledby="binv-tab-email">
      <ol className="binv-steps" aria-label="What happens next">
        <li className="binv-step">
          <span className="binv-step-icon" data-tone="brand">
            <Mail size={15} />
          </span>
          <span>
            <span className="binv-step-title">They get an email</span>
            <span className="binv-step-text">With your message</span>
          </span>
        </li>
        <li className="binv-step">
          <span className="binv-step-icon" data-tone="info">
            <LogIn size={15} />
          </span>
          <span>
            <span className="binv-step-title">Sign up or sign in</span>
            <span className="binv-step-text">New people create an account</span>
          </span>
        </li>
        <li className="binv-step">
          <span className="binv-step-icon" data-tone="success">
            <LayoutGrid size={15} />
          </span>
          <span>
            <span className="binv-step-title">Land on this board</span>
            <span className="binv-step-text">Only this board, as a guest</span>
          </span>
        </li>
      </ol>

      <div>
        <label htmlFor={field_id} className="binv-field-label">
          <span>Email addresses</span>
          {emails.length > 0 && (
            <span className="binv-field-counter">
              {emails.length}/{MAX_INVITE_RECIPIENTS}
            </span>
          )}
        </label>
        <div className="binv-chips-wrap">
          <div
            className="binv-chips"
            data-invalid={invalid_count > 0 ? "true" : "false"}
            data-disabled={is_busy ? "true" : "false"}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault();
                input_ref.current?.focus();
              }
            }}
          >
            {emails.map((email, index) => {
              const kind = chip_kinds[index];
              const copy = CHIP_COPY[kind];
              const member = member_by_email.get(email.toLowerCase());
              return (
                <span key={email} className="binv-chip" data-tone={copy.tone} title={copy.hint}>
                  {member && kind !== "invalid" ? (
                    <UserAvatar user={member} size={20} />
                  ) : (
                    <span className="binv-chip-icon" aria-hidden="true">
                      {kind === "invalid" ? <AlertCircle size={12} /> : kind === "pending" ? <Clock size={12} /> : kind === "on_board" ? <UserCheck size={12} /> : <Mail size={12} />}
                    </span>
                  )}
                  <span
                    className="binv-chip-label"
                    data-editable={kind === "invalid" ? "true" : "false"}
                    onClick={kind === "invalid" ? () => editEmail(email) : undefined}
                  >
                    {member && kind !== "invalid" ? member.full_name : email}
                  </span>
                  <button type="button" className="binv-chip-remove" onClick={() => removeEmail(email)} aria-label={`Remove ${email}`} disabled={is_busy}>
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            <input
              ref={input_ref}
              id={field_id}
              type="text"
              inputMode="email"
              role="combobox"
              aria-expanded={show_suggestions}
              aria-controls={listbox_id}
              aria-autocomplete="list"
              aria-activedescendant={show_suggestions ? `${listbox_id}-${current_index}` : undefined}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              value={draft}
              disabled={is_busy || is_full}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() => {
                setIsSuggestionsOpen(false);
                commitDraft();
              }}
              placeholder={is_full ? `Up to ${MAX_INVITE_RECIPIENTS} people per send` : emails.length > 0 ? "Add more" : "name@company.com, or paste a list"}
              className="binv-chips-input"
            />
          </div>

          {show_suggestions && (
            <ul id={listbox_id} role="listbox" className="binv-suggestions" aria-label="Suggested people">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.kind === "member" ? `member-${suggestion.member.id}` : "email"}
                  id={`${listbox_id}-${index}`}
                  role="option"
                  aria-selected={index === current_index}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="binv-suggestion"
                    data-active={index === current_index ? "true" : "false"}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      // Fires before the input's blur commits the draft.
                      event.preventDefault();
                      pickSuggestion(suggestion);
                    }}
                  >
                    {suggestion.kind === "member" ? (
                      <>
                        <UserAvatar user={suggestion.member} size={28} />
                        <span className="binv-person-text">
                          <span className="binv-person-name">
                            <span>{suggestion.member.full_name}</span>
                          </span>
                          <span className="binv-person-meta">{suggestion.member.email}</span>
                        </span>
                        <span className="binv-pill" data-tone="brand">
                          In workspace
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="binv-team-icon">
                          <MailPlus size={15} />
                        </span>
                        <span className="binv-person-text">
                          <span className="binv-person-name">
                            <span>Invite {suggestion.email}</span>
                          </span>
                          <span className="binv-person-meta">
                            {pending_emails.has(suggestion.email.toLowerCase()) ? "Already invited, this resends the email" : "Not on the site yet, they will create an account"}
                          </span>
                        </span>
                        <Plus size={15} />
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="binv-legend" aria-live="polite" style={{ marginTop: 8 }}>
          {legend.length === 0 ? (
            <span>Press Enter or comma after each address. Workspace members are recognized automatically.</span>
          ) : (
            legend.map(([tone, count, text]) => (
              <span key={tone} className="binv-legend-item" data-tone={tone === "member" ? "brand" : tone}>
                {tone === "member" || tone === "neutral" ? text : `${count} ${text}`}
              </span>
            ))
          )}
        </div>
      </div>

      {is_message_open ? (
        <div>
          <label htmlFor={message_id} className="binv-field-label">
            <span>
              Personal message <span className="binv-field-counter">(optional)</span>
            </span>
            <span className="binv-field-counter">
              {message.length}/{MAX_INVITE_MESSAGE_LENGTH}
            </span>
          </label>
          <textarea
            id={message_id}
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_INVITE_MESSAGE_LENGTH))}
            placeholder="Let them know what you would like them to look at"
            className="binv-textarea"
            disabled={is_busy}
            autoFocus
          />
        </div>
      ) : (
        <button type="button" className="binv-add-message" onClick={() => setIsMessageOpen(true)}>
          <MessageSquarePlus size={15} />
          Add a personal message
        </button>
      )}

      <div className="binv-action-row">
        <span className="binv-action-hint">
          <Clock size={13} />
          Email invitations expire after 7 days
        </span>
        <button type="button" className="inv-button inv-button-primary" onClick={() => void submit()} disabled={!can_send}>
          {is_busy ? <span className="inv-spinner" aria-hidden="true" /> : <Send size={15} />}
          {send_label}
        </button>
      </div>
    </div>
  );
};

export default EmailInvitePanel;
