"use client";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import Toast from "./Toast";

export type ToastItem = {
  id: string;
  actor_name: string;
  actor_initials: string;
  avatar_gradient: string;
  avatar_url?: string;
  action_label: string;
  action_target: string;
  board_name?: string;
  link?: string;
  onAction?: () => void;
};

type ShowToastInput = Omit<ToastItem, "id">;

type ToastContextValue = {
  showToast: (toast: ShowToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 6000;

/**
 * Renders a stack of Slack-style pop-up alerts in the bottom-right corner and
 * exposes `useToast().showToast()` to trigger one. Mounted once in the admin
 * layout so every page under it can raise a toast, most notably
 * `useNotifications` on every incoming `.new_notification` websocket event.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (toast: ShowToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((previous) => [...previous, { ...toast, id }]);

      const timer = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[999] flex flex-col-reverse gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
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
