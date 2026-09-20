"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Toast from "./Toast";

export type ToastVariant = "notification" | "info" | "success" | "warning" | "error";

type ToastBase = {
  /** A toast raised again with the same key replaces the visible one and restarts its timer instead of stacking. */
  dedupe_key?: string;
  /** How long the toast stays, in milliseconds. `0` keeps it until it is dismissed. */
  duration_ms?: number;
  /** Where the "View" button of a notification toast points, the button is hidden without it. */
  link?: string;
  /** Runs when the toast's action button is pressed, right before the toast closes. */
  onAction?: () => void;
};

/** A Slack-style pop-up for a workspace notification: who did what, on which board. */
export type NotificationToastInput = ToastBase & {
  variant?: "notification";
  actor_name: string;
  actor_initials: string;
  avatar_gradient: string;
  avatar_url?: string;
  action_label: string;
  action_target: string;
  board_name?: string;
};

/** A plain feedback message: a title, an optional description and an optional action button. */
export type MessageToastInput = ToastBase & {
  variant: Exclude<ToastVariant, "notification">;
  title: string;
  description?: string;
  /** Label of the action button, shown only together with `onAction`. */
  action_text?: string;
};

export type ShowToastInput = NotificationToastInput | MessageToastInput;

type ToastMeta = {
  id: string;
  /** Grows each time a deduplicated toast is raised again, which restarts its timer. */
  revision: number;
  is_leaving: boolean;
};

export type ToastItem = (
  | (NotificationToastInput & { variant: "notification" })
  | MessageToastInput
) &
  ToastMeta;

type MessageToastOptions = Omit<MessageToastInput, "variant" | "title">;

type ToastContextValue = {
  showToast: (toast: ShowToastInput) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  success: (title: string, options?: MessageToastOptions) => string;
  info: (title: string, options?: MessageToastOptions) => string;
  warning: (title: string, options?: MessageToastOptions) => string;
  error: (title: string, options?: MessageToastOptions) => string;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_VISIBLE_TOASTS = 4;
const LEAVE_ANIMATION_MS = 160;

const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  notification: 6000,
  info: 5000,
  success: 5000,
  warning: 7000,
  error: 8000,
};

const subscribeToVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const getIsPageHidden = () => document.visibilityState === "hidden";

const subscribeToNothing = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Renders the toast stack and exposes `useToast()` to raise one. Mounted once in
 * the admin layout so every page under it can toast, most notably
 * `useNotifications` for every live notification.
 *
 * Built to stay out of the way and to survive hostile browser environments:
 * - The stack is portaled to `document.body`, so no ancestor `overflow`,
 *   `transform` or stacking context can clip or cover it, and it sits above
 *   every popover and modal.
 * - The layer itself ignores pointer events, only the toast cards are
 *   clickable, so it never blocks the page underneath.
 * - A persistent polite live region announces toasts to screen readers.
 * - Timers pause while a toast is hovered, focused or the tab is hidden, so a
 *   toast is never missed, and motion is skipped for `prefers-reduced-motion`.
 * - It only uses standard DOM, CSS and React APIs (no `Notification`,
 *   permissions, cookies or storage), so no browser or extension can block it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // The ref is the source of truth so several toasts raised in the same tick see each other,
  // the state only mirrors it for rendering.
  const toasts_ref = useRef<ToastItem[]>([]);
  const removal_timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const id_counter = useRef(0);

  const is_mounted = useSyncExternalStore(subscribeToNothing, getTrue, getFalse);
  const is_page_hidden = useSyncExternalStore(subscribeToVisibility, getIsPageHidden, getFalse);

  const commitToasts = useCallback((next: ToastItem[]) => {
    toasts_ref.current = next;
    setToasts(next);
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      commitToasts(toasts_ref.current.filter((toast) => toast.id !== id));
      const timer = removal_timers.current.get(id);
      if (timer) clearTimeout(timer);
      removal_timers.current.delete(id);
    },
    [commitToasts]
  );

  /** Plays the leave animation, then removes the toast. */
  const dismissToast = useCallback(
    (id: string) => {
      if (removal_timers.current.has(id)) return;

      commitToasts(toasts_ref.current.map((toast) => (toast.id === id ? { ...toast, is_leaving: true } : toast)));
      removal_timers.current.set(
        id,
        setTimeout(() => removeToast(id), prefersReducedMotion() ? 0 : LEAVE_ANIMATION_MS)
      );
    },
    [commitToasts, removeToast]
  );

  const dismissAllToasts = useCallback(() => {
    toasts_ref.current.forEach((toast) => dismissToast(toast.id));
  }, [dismissToast]);

  const showToast = useCallback(
    (input: ShowToastInput): string => {
      const variant: ToastVariant = input.variant ?? "notification";
      const existing = input.dedupe_key
        ? toasts_ref.current.find((toast) => toast.dedupe_key === input.dedupe_key && !toast.is_leaving)
        : undefined;
      const id = existing?.id ?? `toast-${Date.now()}-${++id_counter.current}`;
      const next_item = {
        ...input,
        variant,
        duration_ms: input.duration_ms ?? DEFAULT_DURATION_MS[variant],
        id,
        revision: (existing?.revision ?? 0) + 1,
        is_leaving: false,
      } as ToastItem;

      commitToasts(
        existing
          ? toasts_ref.current.map((toast) => (toast.id === id ? next_item : toast))
          : [...toasts_ref.current, next_item]
      );
      return id;
    },
    [commitToasts]
  );

  // Beyond the cap the oldest toasts leave, so a burst never covers the page.
  useEffect(() => {
    const active = toasts.filter((toast) => !toast.is_leaving);
    active.slice(0, Math.max(0, active.length - MAX_VISIBLE_TOASTS)).forEach((toast) => dismissToast(toast.id));
  }, [toasts, dismissToast]);

  useEffect(() => {
    const timers = removal_timers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const context_value = useMemo<ToastContextValue>(() => {
    const raise = (variant: MessageToastInput["variant"]) => (title: string, options?: MessageToastOptions) =>
      showToast({ ...options, variant, title });

    return {
      showToast,
      dismissToast,
      dismissAllToasts,
      success: raise("success"),
      info: raise("info"),
      warning: raise("warning"),
      error: raise("error"),
    };
  }, [showToast, dismissToast, dismissAllToasts]);

  return (
    <ToastContext.Provider value={context_value}>
      {children}
      {is_mounted &&
        createPortal(
          <section
            aria-label="Notifications"
            aria-live="polite"
            aria-relevant="additions text"
            className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[1100] flex flex-col-reverse items-end gap-2 sm:left-auto sm:right-4"
          >
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} is_page_hidden={is_page_hidden} onDismiss={dismissToast} />
            ))}
          </section>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
