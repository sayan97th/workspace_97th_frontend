"use client";
import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { CloseIcon } from "@/icons/workspace-icons";
import type { ToastItem } from "./ToastProvider";

type ToastProps = {
  toast: ToastItem;
  is_page_hidden: boolean;
  onDismiss: (id: string) => void;
};

const VARIANT_STYLES = {
  info: { Icon: Info, color: "text-blue-light-500" },
  success: { Icon: CheckCircle2, color: "text-success-500" },
  warning: { Icon: AlertTriangle, color: "text-warning-500" },
  error: { Icon: XCircle, color: "text-error-500" },
} as const;

/**
 * Closes the toast after `duration_ms`, unless it is paused. Pausing keeps the
 * time already spent, so hovering a toast never resets or skips its countdown,
 * and `restart_key` (a deduplicated toast raised again) starts it over.
 */
function useAutoDismiss(duration_ms: number, is_paused: boolean, restart_key: number, onExpire: () => void) {
  const expire_ref = useRef(onExpire);
  const remaining_ms_ref = useRef(duration_ms);

  useEffect(() => {
    expire_ref.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    remaining_ms_ref.current = duration_ms;
  }, [restart_key, duration_ms]);

  useEffect(() => {
    if (duration_ms <= 0 || is_paused) return;

    const started_at = Date.now();
    const timer = setTimeout(() => expire_ref.current(), remaining_ms_ref.current);
    return () => {
      clearTimeout(timer);
      remaining_ms_ref.current = Math.max(0, remaining_ms_ref.current - (Date.now() - started_at));
    };
  }, [is_paused, restart_key, duration_ms]);
}

/**
 * The person's avatar, falling back to their initials when the image is
 * missing or fails to load (a blocked third-party request, an expired URL).
 */
const ToastAvatar: React.FC<{ name: string; initials: string; gradient: string; url?: string }> = ({
  name,
  initials,
  gradient,
  url,
}) => {
  const [has_failed, setHasFailed] = useState(false);

  if (url && !has_failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
        className="h-[30px] w-[30px] flex-none rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: gradient }}
      role="img"
      aria-label={name}
    >
      {initials}
    </span>
  );
};

/**
 * A single toast card. A notification toast is Slack-style: actor avatar, an
 * actor + action sentence, the board it happened on and a "View" button that
 * navigates to where it was generated. The other variants are plain feedback
 * messages with an icon, a title, an optional description and an optional
 * action. Every card can be closed with its button or the Escape key.
 */
const Toast: React.FC<ToastProps> = ({ toast, is_page_hidden, onDismiss }) => {
  const [is_hovered, setIsHovered] = useState(false);
  const [is_focused, setIsFocused] = useState(false);

  const { id, revision, duration_ms = 0, is_leaving } = toast;

  useAutoDismiss(duration_ms, is_hovered || is_focused || is_page_hidden || is_leaving, revision, () => onDismiss(id));

  const handleAction = () => {
    toast.onAction?.();
    onDismiss(id);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onDismiss(id);
  };

  const variant_style = toast.variant === "notification" ? null : VARIANT_STYLES[toast.variant];
  const action_button_class = "mt-2 rounded text-xs font-semibold text-[#7fb2ff] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fb2ff]";

  return (
    <div
      role={toast.variant === "error" ? "alert" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`pointer-events-auto flex w-[360px] max-w-full gap-3 rounded-[11px] border border-shell-border bg-shell-panel-alt p-[13px] shadow-lg motion-reduce:animate-none ${
        is_leaving
          ? "animate-[toast-out_160ms_ease-in_forwards] motion-reduce:opacity-0"
          : "animate-[toast-in_200ms_cubic-bezier(0.16,1,0.3,1)]"
      }`}
    >
      {toast.variant === "notification" ? (
        <>
          <ToastAvatar
            key={toast.avatar_url ?? "initials"}
            name={toast.actor_name}
            initials={toast.actor_initials}
            gradient={toast.avatar_gradient}
            url={toast.avatar_url}
          />

          <span className="min-w-0 flex-1">
            <span className="block break-words text-[13px] leading-[1.5] text-shell-text-secondary">
              <strong className="font-bold text-shell-text">{toast.actor_name}</strong>{" "}
              <span className="text-[#7fb2ff]">{toast.action_label}</span> {toast.action_target}
            </span>
            {toast.board_name && (
              <span className="mt-1 block truncate text-xs text-shell-text-muted">{toast.board_name}</span>
            )}

            {toast.link && (
              <button type="button" onClick={handleAction} className={action_button_class}>
                View
              </button>
            )}
          </span>
        </>
      ) : (
        <>
          {variant_style && (
            <variant_style.Icon size={20} className={`mt-px flex-none ${variant_style.color}`} aria-hidden="true" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block break-words text-[13px] font-semibold leading-[1.5] text-shell-text">
              {toast.title}
            </span>
            {toast.description && (
              <span className="mt-0.5 block break-words text-xs leading-[1.5] text-shell-text-secondary">
                {toast.description}
              </span>
            )}

            {toast.onAction && toast.action_text && (
              <button type="button" onClick={handleAction} className={action_button_class}>
                {toast.action_text}
              </button>
            )}
          </span>
        </>
      )}

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="-m-1 flex h-6 w-6 flex-none items-center justify-center rounded text-shell-text-faint hover:text-shell-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7fb2ff]"
        aria-label="Dismiss"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
};

export default Toast;
