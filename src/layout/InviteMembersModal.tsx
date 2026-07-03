"use client";
import React, { useEffect, useState } from "react";
import RoleSelect from "./RoleSelect";
import { CheckIcon, CloseIcon, LinkIcon } from "./workspace-icons";
import {
  invite_default_role,
  invite_email_placeholder,
  invite_link as default_invite_link,
  invite_message_placeholder,
  type InviteRoleId,
} from "@/data/invite-members-data";

export type InviteMembersSubmission = {
  /** Raw emails entered, split on commas/whitespace and trimmed. */
  emails: string[];
  role: InviteRoleId;
  message: string;
};

type InviteMembersModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Shareable join link shown in the "Invite with link" section. */
  invite_link?: string;
  onSubmit?: (submission: InviteMembersSubmission) => void;
};

/** Splits the free-text email field into a clean list of addresses. */
const parseEmails = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

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
  invite_link = default_invite_link,
  onSubmit,
}) => {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<InviteRoleId>(invite_default_role);
  const [message, setMessage] = useState("");
  const [is_link_copied, setIsLinkCopied] = useState(false);

  // Reset the form every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setEmails("");
      setRole(invite_default_role);
      setMessage("");
      setIsLinkCopied(false);
    }
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invite_link);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  const parsed_emails = parseEmails(emails);
  const can_submit = parsed_emails.length > 0;

  const handleSubmit = () => {
    if (!can_submit) return;
    onSubmit?.({
      emails: parsed_emails,
      role,
      message: message.trim(),
    });
    onClose();
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

      <div className="relative z-[401] flex max-h-[92vh] w-[560px] max-w-full flex-col overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#132424] text-[#e9eded] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
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
            className="-mr-2 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-2 pt-6">
          {/* Invite with link */}
          <label className="mb-2 block text-[12.5px] font-semibold text-[#C7D0D0]">
            Invite with link
          </label>
          <div className="flex gap-2.5">
            <div className="flex flex-1 items-center gap-2 truncate rounded-[10px] border border-white/[0.10] bg-[#0e1d1d] px-3.5 py-[11px] text-[13px] text-gray-300">
              <LinkIcon size={14} className="flex-none text-gray-400" />
              <span className="truncate">{invite_link}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-none items-center gap-2 rounded-[10px] border border-white/[0.12] px-4 text-[13px] font-semibold text-[#E9EDED] transition-colors hover:border-brand-500 hover:text-white"
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
          </div>

          <div className="my-6 h-px bg-white/[0.09]" />

          {/* Invite with email */}
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12.5px] font-semibold text-[#C7D0D0]">
              Invite with email
            </label>
            <RoleSelect value={role} onChange={setRole} />
          </div>
          <textarea
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder={invite_email_placeholder}
            rows={3}
            className="w-full resize-none rounded-[11px] border border-white/[0.12] bg-[#0e1d1d] px-3.5 py-3 text-[13.5px] text-[#e9eded] placeholder:text-gray-400 focus:border-brand-500 focus:outline-none"
          />

          {/* Optional message */}
          <label className="mb-2 mt-5 block text-[12.5px] font-semibold text-[#C7D0D0]">
            Write a message{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={invite_message_placeholder}
            rows={3}
            className="w-full resize-none rounded-[11px] border border-white/[0.12] bg-[#0e1d1d] px-3.5 py-3 text-[13.5px] text-[#e9eded] placeholder:text-gray-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] px-4 py-[11px] text-[13.5px] font-semibold text-gray-300 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!can_submit}
            className="rounded-[9px] bg-brand-500 px-[22px] py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send invites
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;
