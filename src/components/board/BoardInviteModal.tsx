"use client";
import React, { useEffect, useState } from "react";
import { AVATAR_GRADIENTS } from "./TeamAvatars";
import { boardInvitationService } from "@/services/board-invitation.service";
import type { ApiError } from "@/types/auth";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardType } from "@/types/workspace";
import { BuildingIcon, CheckIcon, CloseIcon, CrownIcon, MailIcon } from "@/icons/workspace-icons";

export type BoardInviteModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  board_label: string;
  board_type: BoardType;
  workspace_name: string;
  /** Preloaded roster so the dialog opens instantly instead of showing a spinner first. */
  initial_access: BoardAccessEntry[];
  /** Called whenever the roster changes (invite sent, invite revoked, access removed) so the header's "Invite / {count}" badge stays in sync. */
  onAccessChange: (access: BoardAccessEntry[]) => void;
};

/** Splits the free-text email field into a clean list of addresses. */
const parseEmails = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const hashId = (id: number): number => Math.abs(id);

/** The "Anyone at {workspace} can access this board" style notice, tuned per board type. */
const accessNoticeFor = (board_type: BoardType, workspace_name: string): string => {
  if (board_type === "private") {
    return "Only the people invited below can open this board.";
  }
  if (board_type === "shareable") {
    return `Everyone in ${workspace_name} can access this board. Invite people outside the workspace by email below.`;
  }
  return `Anyone at ${workspace_name} can access this board.`;
};

const RosterAvatar: React.FC<{ full_name: string | null; person_id: number; size?: number }> = ({
  full_name,
  person_id,
  size = 32,
}) => (
  <span
    className="flex flex-none items-center justify-center rounded-full font-bold text-white"
    style={{
      width: size,
      height: size,
      fontSize: Math.max(9, Math.round(size * 0.38)),
      background: full_name
        ? AVATAR_GRADIENTS[hashId(person_id) % AVATAR_GRADIENTS.length]
        : "var(--color-shell-hover-strong)",
    }}
  >
    {full_name ? getInitials(full_name) : <MailIcon size={Math.round(size * 0.42)} className="text-shell-text-muted" />}
  </span>
);

/**
 * "Invite to this board" dialog opened from the board header's
 * "Invite / {count}" button. Grants view-only access to a single board by
 * email, independent of full workspace membership. Visually mirrors
 * `InviteMembersModal` (the workspace-wide invite dialog) but scoped to one
 * board: no role picker (every grant is a viewer) and no shareable link,
 * plus a live roster of who already has access.
 */
const BoardInviteModal: React.FC<BoardInviteModalProps> = ({
  is_open,
  onClose,
  board_id,
  board_label,
  board_type,
  workspace_name,
  initial_access,
  onAccessChange,
}) => {
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [access, setAccess] = useState<BoardAccessEntry[]>(initial_access);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [submit_notice, setSubmitNotice] = useState<string | null>(null);
  const [removing_key, setRemovingKey] = useState<string | null>(null);

  // Reset the compose form (but not the roster) every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setEmails("");
      setMessage("");
      setAccess(initial_access);
      setIsSubmitting(false);
      setSubmitError(null);
      setSubmitNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open) return null;

  const parsed_emails = parseEmails(emails);
  const can_submit = parsed_emails.length > 0 && !is_submitting;

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const result = await boardInvitationService.inviteViewers(board_id, parsed_emails, message.trim());
      // Re-inviting someone still pending resends (rather than duplicating)
      // their existing invitation server-side, so merge by key instead of
      // appending — otherwise a resend renders a second row with the same
      // React key as the one already in the roster.
      const updated_keys = new Set(result.data.map((row) => row.key));
      const next_access = [...access.filter((row) => !updated_keys.has(row.key)), ...result.data];
      setAccess(next_access);
      onAccessChange(next_access);
      setEmails("");
      setMessage("");
      if (result.data.length > 0 && result.skipped.length === 0) {
        setSubmitNotice(result.data.length === 1 ? "1 invitation was sent." : `${result.data.length} invitations were sent.`);
      } else if (result.data.length > 0 && result.skipped.length > 0) {
        setSubmitNotice(
          `${result.data.length === 1 ? "1 invitation was sent." : `${result.data.length} invitations were sent.`} Already had access, so skipped: ${result.skipped.map((s) => s.email).join(", ")}`
        );
      } else {
        setSubmitNotice(`Everyone you entered already has access: ${result.skipped.map((s) => s.email).join(", ")}`);
      }
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "We couldn't send those invites. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (entry: BoardAccessEntry) => {
    setRemovingKey(entry.key);
    setSubmitError(null);
    try {
      if (entry.kind === "invitation") {
        await boardInvitationService.revokeInvitation(board_id, entry.id);
      } else {
        await boardInvitationService.removeCollaborator(board_id, entry.id);
      }
      const next_access = access.filter((row) => row.key !== entry.key);
      setAccess(next_access);
      onAccessChange(next_access);
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "We couldn't remove that access. Please try again."));
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite to this board"
      className="fixed inset-0 z-[400] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[401] flex max-h-[92vh] w-[560px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.01em]">Invite to this board</h2>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-gray-400">
              Give someone a view of &ldquo;{board_label}&rdquo; without adding them to the whole workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-2 pt-6">
          {/* Invite with email */}
          <label className="mb-2 block text-[12.5px] font-semibold text-shell-text-secondary">
            Search by name or email address
          </label>
          <textarea
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="name@company.com, name@company.com ..."
            rows={2}
            disabled={is_submitting}
            className="w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-bg px-3.5 py-3 text-[13.5px] text-shell-text placeholder:text-gray-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
          />

          {/* Optional message */}
          <label className="mb-2 mt-4 block text-[12.5px] font-semibold text-shell-text-secondary">
            Write a message <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Let them know what you'd like them to look at"
            rows={2}
            disabled={is_submitting}
            className="w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-bg px-3.5 py-3 text-[13.5px] text-shell-text placeholder:text-gray-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
          />

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!can_submit}
              className="rounded-[9px] bg-brand-500 px-[18px] py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_submitting ? "Sending…" : "Send invites"}
            </button>
          </div>

          {submit_notice && (
            <p className="mt-3 rounded-[10px] border border-success-500/30 bg-success-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-shell-text">
              {submit_notice}
            </p>
          )}
          {submit_error && (
            <p className="mt-3 rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-error-400">
              {submit_error}
            </p>
          )}

          <div className="my-6 h-px bg-shell-hover-strong" />

          {/* "Anyone at ... can access" notice */}
          <div className="mb-6 flex items-center gap-2.5 text-[13px] text-shell-text-secondary">
            <span className="flex-none text-shell-text-muted">
              <BuildingIcon size={15} />
            </span>
            <span>{accessNoticeFor(board_type, workspace_name)}</span>
          </div>

          {/* Roster */}
          <label className="mb-2.5 block text-[12.5px] font-semibold text-shell-text-secondary">
            People invited to this board
          </label>
          <div className="flex flex-col">
            {access.length === 0 ? (
              <p className="py-3 text-[13px] text-shell-text-faint">No one has been invited yet.</p>
            ) : (
              access.map((entry) => (
                <div key={entry.key} className="group flex items-center gap-3 rounded-[10px] px-1.5 py-2 hover:bg-shell-hover">
                  <RosterAvatar full_name={entry.full_name} person_id={entry.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-shell-text">
                      {entry.full_name ?? entry.email}
                    </p>
                    <p className="truncate text-[12px] text-shell-text-muted">
                      {entry.full_name ? entry.email : entry.status === "pending" ? "Invitation pending" : "Viewer"}
                    </p>
                  </div>
                  {entry.kind === "owner" ? (
                    <span className="flex flex-none items-center gap-1 text-sunset-200" title="Board owner">
                      <CrownIcon size={15} />
                    </span>
                  ) : entry.status === "pending" ? (
                    <span className="flex-none rounded-full bg-shell-hover-strong px-2 py-0.5 text-[11px] font-semibold text-shell-text-muted">
                      Pending
                    </span>
                  ) : (
                    <span className="flex flex-none items-center gap-1 text-success-400" title="Can view this board">
                      <CheckIcon size={13} />
                    </span>
                  )}
                  {entry.removable && (
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      disabled={removing_key === entry.key}
                      aria-label={`Remove ${entry.full_name ?? entry.email}`}
                      className="flex flex-none items-center justify-center rounded-lg p-1 text-shell-text-faint opacity-0 transition-opacity hover:bg-shell-hover-strong hover:text-shell-text group-hover:opacity-100 disabled:opacity-50"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-shell-border px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] px-4 py-[11px] text-[13.5px] font-semibold text-gray-300 transition-colors hover:text-shell-text"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardInviteModal;
