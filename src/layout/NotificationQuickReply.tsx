"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";

type NotificationQuickReplyProps = {
  /** Who the reply goes to, for the placeholder and the label. */
  actor_name: string;
  /** Posts the reply. Rejects with the reason it failed, which is shown under the box while the text stays. */
  onSend: (body: string) => Promise<void>;
  /** Closes the box, after a send or when it is cancelled. */
  onClose: () => void;
};

const MAX_REPLY_LENGTH = 5000;

/**
 * The small reply box that opens under a notification card. Enter sends,
 * Shift+Enter adds a line and Escape cancels, so a quick answer never needs the
 * drawer of the update it belongs to. It stops key presses from reaching the
 * bell drawer's own j, k, o and e shortcuts while somebody types.
 */
const NotificationQuickReply: React.FC<NotificationQuickReplyProps> = ({ actor_name, onSend, onClose }) => {
  const [text, setText] = useState("");
  const [is_sending, setIsSending] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);
  const textarea_id = useId();

  useEffect(() => {
    textarea_ref.current?.focus();
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || is_sending) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      await onSend(body);
      onClose();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Couldn't send your reply. Please try again."));
      setIsSending(false);
    }
  };

  return (
    <div className="mt-1.5 rounded-[11px] border border-shell-border bg-shell-panel-alt p-2.5">
      <label htmlFor={textarea_id} className="sr-only">
        Reply to {actor_name}
      </label>
      <textarea
        id={textarea_id}
        ref={textarea_ref}
        value={text}
        maxLength={MAX_REPLY_LENGTH}
        rows={2}
        disabled={is_sending}
        placeholder={`Reply to ${actor_name}...`}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void send();
          }
        }}
        className="w-full resize-none rounded-lg border border-shell-border bg-shell-panel px-2.5 py-2 text-[13px] text-shell-text placeholder:text-shell-text-muted focus:border-brand-500 focus:outline-none disabled:opacity-60"
      />
      {error_message && (
        <p role="alert" className="mt-1.5 text-[12px] font-semibold text-[#e2445c]">
          {error_message}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="hidden text-[11px] text-shell-text-faint sm:inline">Enter to send, Shift+Enter for a new line</span>
        <button
          type="button"
          onClick={onClose}
          disabled={is_sending}
          className="ml-auto rounded-lg px-2.5 py-1 text-[12px] font-semibold text-shell-text-muted hover:bg-shell-hover hover:text-shell-text disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void send()}
          disabled={is_sending || text.trim() === ""}
          className="rounded-lg bg-brand-500 px-3 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {is_sending ? "Sending..." : "Reply"}
        </button>
      </div>
    </div>
  );
};

export default NotificationQuickReply;
