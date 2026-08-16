"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleSelect from "./RoleSelect";
import { CheckIcon, CloseIcon, LinkIcon, RefreshIcon } from "@/icons/workspace-icons";
import {
  invite_default_role,
  invite_email_placeholder,
  invite_message_placeholder,
  type InviteRoleId,
} from "@/data/invite-members-data";
import { workspaceInviteLinkService } from "@/services/workspace-invite-link.service";
import type { ApiError } from "@/types/auth";
import type { WorkspaceInviteLink } from "@/types/invitation";

export type InviteMembersSubmission = {
  /** Raw emails entered, split on commas/whitespace and trimmed. */
  emails: string[];
  role: InviteRoleId;
  message: string;
};

/** Outcome of a real invite submission, reported back so the modal can show a summary before closing. */
export type InviteMembersResult = {
  invited_count: number;
  /** Emails that were not (re)invited because they're already members. */
  skipped_emails: string[];
};

/** "Invite with link" section state: fetched on open, since only a workspace owner or admin may view/manage it. */
type InviteLinkState =
  | { status: "loading" }
  | { status: "loaded"; link: WorkspaceInviteLink }
  | { status: "error"; message: string };

type InviteMembersModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Active workspace's slug, used to load the shareable link and carried into the "View sent invitations" link so that page opens scoped to the same workspace. */
  workspace_slug?: string;
  onSubmit?: (submission: InviteMembersSubmission) => Promise<InviteMembersResult>;
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

/**
 * Centered "Invite members" dialog opened from the AppTopBar invite button.
 * Blends the two approved designs: the compact invite popover (link + role +
 * send) grown into a larger centered modal, plus the "Write a message" field
 * from the request-access flow. Data and the submit handler are injected so the
 * modal can later be wired to the API without touching presentation.
 */
const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  is_open,
  onClose,
  workspace_slug,
  onSubmit,
}) => {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<InviteRoleId>(invite_default_role);
  const [message, setMessage] = useState("");
  const [is_link_copied, setIsLinkCopied] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteMembersResult | null>(null);
  const [link_state, setLinkState] = useState<InviteLinkState>({ status: "loading" });
  const [is_regenerating_link, setIsRegeneratingLink] = useState(false);

  // Reset the form every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setEmails("");
      setRole(invite_default_role);
      setMessage("");
      setIsLinkCopied(false);
      setIsSubmitting(false);
      setSubmitError(null);
      setResult(null);
    }
  }, [is_open]);

  // Load the workspace's shareable link every time the modal opens. Only a
  // workspace owner or admin can see it, so members get a friendly notice
  // instead (via `link_state.status === "error"`).
  useEffect(() => {
    if (!is_open || !workspace_slug) return;
    let cancelled = false;
    setLinkState({ status: "loading" });
    workspaceInviteLinkService
      .getInviteLink(workspace_slug)
      .then((link) => {
        if (!cancelled) setLinkState({ status: "loaded", link });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLinkState({
          status: "error",
          message: apiErrorMessage(error, "You don't have permission to view this workspace's invite link."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [is_open, workspace_slug]);

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

  const handleCopyLink = async () => {
    if (link_state.status !== "loaded") return;
    try {
      await navigator.clipboard.writeText(link_state.link.url);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  const handleRegenerateLink = async () => {
    if (!workspace_slug || is_regenerating_link) return;
    setIsRegeneratingLink(true);
    try {
      const link = await workspaceInviteLinkService.regenerateInviteLink(workspace_slug);
      setLinkState({ status: "loaded", link });
    } catch (error) {
      setLinkState({ status: "error", message: apiErrorMessage(error, "We couldn't reset that link. Please try again.") });
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const parsed_emails = parseEmails(emails);
  const can_submit = parsed_emails.length > 0 && !is_submitting;

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const submission_result = await onSubmit?.({
        emails: parsed_emails,
        role,
        message: message.trim(),
      });
      setResult(submission_result ?? { invited_count: parsed_emails.length, skipped_emails: [] });
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "We couldn't send those invites. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite members"
      className="fixed inset-0 z-[400] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.62]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[401] flex max-h-[92vh] w-[560px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.01em]">
              Invite members
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-gray-400">
              Invite teammates to collaborate in this workspace.
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

        {result ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-2 pt-6">
            <div className="flex items-start gap-3 rounded-[11px] border border-success-500/30 bg-success-500/10 px-4 py-3.5">
              <CheckIcon size={16} className="mt-0.5 flex-none text-success-400" />
              <div className="text-[13.5px] leading-[1.55] text-shell-text">
                {result.invited_count > 0 ? (
                  <p>
                    {result.invited_count === 1
                      ? "1 invitation was sent."
                      : `${result.invited_count} invitations were sent.`}
                  </p>
                ) : (
                  <p>No new invitations were sent.</p>
                )}
                {result.skipped_emails.length > 0 && (
                  <p className="mt-1.5 text-shell-text-secondary">
                    Already a member, so skipped: {result.skipped_emails.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-2 pt-6">
            {/* Invite with link */}
            <label className="mb-2 block text-[12.5px] font-semibold text-shell-text-secondary">
              Invite with link
            </label>
            {link_state.status === "error" ? (
              <p className="rounded-[10px] border border-shell-border-strong bg-shell-bg px-3.5 py-3 text-[13px] leading-[1.5] text-shell-text-secondary">
                {link_state.message}
              </p>
            ) : (
              <div className="flex gap-2.5">
                <div className="flex flex-1 items-center gap-2 truncate rounded-[10px] border border-shell-border-strong bg-shell-bg px-3.5 py-[11px] text-[13px] text-gray-300">
                  <LinkIcon size={14} className="flex-none text-gray-400" />
                  <span className="truncate">
                    {link_state.status === "loaded" ? link_state.link.url : "Loading link…"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={link_state.status !== "loaded"}
                  className="flex flex-none items-center gap-2 rounded-[10px] border border-shell-border-strong px-4 text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {is_link_copied ? (
                    <>
                      <CheckIcon size={13} className="text-success-400" />
                      Copied
                    </>
                  ) : (
                    "Copy"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateLink}
                  disabled={link_state.status !== "loaded" || is_regenerating_link}
                  aria-label="Reset invite link"
                  title="Reset invite link"
                  className="flex flex-none items-center justify-center rounded-[10px] border border-shell-border-strong px-3 text-shell-text-secondary transition-colors hover:border-brand-500 hover:text-shell-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshIcon size={14} className={is_regenerating_link ? "animate-spin" : undefined} />
                </button>
              </div>
            )}
            {link_state.status === "loaded" && !link_state.link.enabled && (
              <p className="mt-2 text-[12px] leading-[1.5] text-shell-text-muted">
                Link invites are currently turned off for this workspace.
              </p>
            )}

            <div className="my-6 h-px bg-shell-hover-strong" />

            {/* Invite with email */}
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[12.5px] font-semibold text-shell-text-secondary">
                Invite with email
              </label>
              <RoleSelect value={role} onChange={setRole} />
            </div>
            <textarea
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              placeholder={invite_email_placeholder}
              rows={3}
              disabled={is_submitting}
              className="w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-bg px-3.5 py-3 text-[13.5px] text-shell-text placeholder:text-gray-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />

            {/* Optional message */}
            <label className="mb-2 mt-5 block text-[12.5px] font-semibold text-shell-text-secondary">
              Write a message{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={invite_message_placeholder}
              rows={3}
              disabled={is_submitting}
              className="w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-bg px-3.5 py-3 text-[13.5px] text-shell-text placeholder:text-gray-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />

            {submit_error && (
              <p className="mt-4 rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-error-400">
                {submit_error}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-shell-border px-8 py-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(workspace_slug ? `/invitations?workspace=${workspace_slug}` : "/invitations");
            }}
            className="rounded-[9px] px-2 py-[11px] text-[12.5px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
          >
            View sent invitations
          </button>

          <div className="flex items-center gap-3">
            {result ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-[9px] bg-brand-500 px-[22px] py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[9px] px-4 py-[11px] text-[13.5px] font-semibold text-gray-300 transition-colors hover:text-shell-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!can_submit}
                  className="rounded-[9px] bg-brand-500 px-[22px] py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {is_submitting ? "Sending…" : "Send invites"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;
