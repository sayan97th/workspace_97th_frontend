"use client";
import React, { useEffect, useState } from "react";
import MemberSelectRow from "./MemberSelectRow";
import { CloseIcon } from "./workspace-icons";
import {
  request_access_members as default_members,
  request_access_message_placeholder,
  type RequestAccessMember,
} from "@/data/request-access-data";

export type RequestAccessSubmission = {
  member_ids: string[];
  message: string;
};

type RequestAccessModalProps = {
  is_open: boolean;
  onClose: () => void;
  members?: RequestAccessMember[];
  onSubmit?: (submission: RequestAccessSubmission) => void;
};

/** Seeds the selection set from each member's `default_selected` flag. */
const buildDefaultSelection = (members: RequestAccessMember[]): Set<string> =>
  new Set(members.filter((member) => member.default_selected).map((member) => member.id));

/**
 * "Request to become a member" dialog opened from the AppTopBar "Request edit
 * access" button. The left side lets the requester pick which admins to notify
 * and add a message; the right side shows the approved illustration. Data and
 * the submit handler are injected so the modal can be reused with live members.
 */
const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  is_open,
  onClose,
  members = default_members,
  onSubmit,
}) => {
  const [selected_ids, setSelectedIds] = useState<Set<string>>(() =>
    buildDefaultSelection(members)
  );
  const [message, setMessage] = useState("");

  // Reset selection + message every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setSelectedIds(buildDefaultSelection(members));
      setMessage("");
    }
  }, [is_open, members]);

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

  const toggleMember = (member_id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(member_id)) {
        next.delete(member_id);
      } else {
        next.add(member_id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit?.({
      member_ids: [...selected_ids],
      message: message.trim(),
    });
    onClose();
  };

  const can_submit = selected_ids.size > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request to become a member"
      className="fixed inset-0 z-[400] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.62]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[401] flex max-h-[92vh] w-[840px] max-w-full overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#132424] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* Form side */}
        <div className="flex flex-1 flex-col p-[34px_34px_28px] text-[#e9eded]">
          <h2 className="text-2xl font-extrabold tracking-[-0.01em]">
            Request to become a member
          </h2>
          <p className="mt-2.5 text-[13.5px] leading-[1.55] text-gray-400">
            Request full collaboration rights from the account admin to create
            your own boards, add items and write updates.
          </p>

          <div className="my-5 mb-1 h-px bg-white/[0.09]" />

          <div className="shell-scrollbar -mx-1.5 max-h-[260px] min-h-0 flex-1 overflow-y-auto px-1.5">
            {members.map((member) => (
              <MemberSelectRow
                key={member.id}
                member={member}
                is_selected={selected_ids.has(member.id)}
                onToggle={toggleMember}
              />
            ))}
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={request_access_message_placeholder}
            className="mt-3.5 h-[70px] w-full resize-none rounded-[11px] border border-white/[0.12] bg-[#0e1d1d] px-3.5 py-3 text-[13.5px] text-[#e9eded] placeholder:text-gray-400 focus:border-brand-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!can_submit}
            className="mt-4 self-start rounded-[9px] bg-brand-500 px-[22px] py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send request
          </button>
        </div>

        {/* Illustration side */}
        <div className="relative flex w-[300px] flex-none items-center justify-center overflow-hidden bg-[#f4f4f2]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3.5 top-3.5 flex h-[30px] w-[30px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#e8e8e6]"
          >
            <CloseIcon size={16} />
          </button>

          <div className="flex h-[190px] w-[190px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#b79be8,#8a5cd8)]">
            <div className="flex w-[150px] flex-col gap-[7px] rounded-xl bg-white p-3 shadow-[0_10px_24px_rgba(90,52,122,0.28)]">
              {[
                "bg-[#3bb273]",
                "bg-[#3bb273]",
                "bg-[#f0a93b]",
                "bg-[#f0a93b]",
              ].map((label_color, index) => (
                <div key={index} className="flex items-center gap-[7px]">
                  <span className={`h-3 w-[52px] flex-none rounded ${label_color}`} />
                  <span className="h-3 flex-1 rounded bg-[#2e9be6]" />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-5 top-11 max-w-[150px] rounded-[12px_12px_12px_2px] bg-white px-3 py-[9px] text-[11.5px] font-medium leading-[1.4] text-[#3a3a3a] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            Hi, can I please have access to edit this board
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessModal;
