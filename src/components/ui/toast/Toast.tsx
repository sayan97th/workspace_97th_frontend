"use client";
import React from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import type { ToastItem } from "./ToastProvider";

type ToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

/**
 * A single Slack-style pop-up alert: actor avatar, an actor + action
 * sentence, the board it happened on, a "View" button that navigates
 * straight to where the notification was generated, and a close button.
 */
const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, actor_name, avatar_gradient, action_label, action_target, board_name, link } = toast;

  const handleView = () => {
    toast.onAction?.();
    onDismiss(id);
  };

  return (
    <div className="flex w-[360px] gap-3 rounded-[11px] border border-shell-border bg-shell-panel-alt p-[13px] shadow-lg">
      <span
        className="h-[30px] w-[30px] flex-none rounded-full"
        style={{ background: avatar_gradient }}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[1.5] text-shell-text-secondary">
          <strong className="font-bold text-shell-text">{actor_name}</strong>{" "}
          <span className="text-[#7fb2ff]">{action_label}</span> {action_target}
        </span>
        {board_name && (
          <span className="mt-1 block text-xs text-shell-text-muted">{board_name}</span>
        )}

        {link && (
          <button
            type="button"
            onClick={handleView}
            className="mt-2 text-xs font-semibold text-[#7fb2ff] hover:underline"
          >
            View
          </button>
        )}
      </span>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="flex-none text-shell-text-faint hover:text-shell-text-muted"
        aria-label="Dismiss notification"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
};

export default Toast;
