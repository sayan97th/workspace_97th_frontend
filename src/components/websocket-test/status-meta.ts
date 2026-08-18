import type { EchoConnectionState } from "@/types/websocket-test";

export type StatusTone = "success" | "warning" | "error" | "neutral";

export const TONE_CLASSES: Record<StatusTone, { dot: string; text: string; bg: string; border: string }> = {
  success: {
    dot: "bg-success-500",
    text: "text-success-600",
    bg: "bg-success-50",
    border: "border-success-300",
  },
  warning: {
    dot: "bg-warning-500",
    text: "text-warning-600",
    bg: "bg-warning-50",
    border: "border-warning-500/30",
  },
  error: {
    dot: "bg-error-500",
    text: "text-error-600",
    bg: "bg-error-50",
    border: "border-error-300",
  },
  neutral: {
    dot: "bg-gray-400",
    text: "text-shell-text-secondary",
    bg: "bg-shell-panel-alt",
    border: "border-shell-border",
  },
};

export const CONNECTION_STATE_META: Record<EchoConnectionState, { label: string; tone: StatusTone }> = {
  initialized: { label: "Initializing", tone: "neutral" },
  connecting: { label: "Connecting", tone: "warning" },
  connected: { label: "Connected", tone: "success" },
  unavailable: { label: "Unavailable", tone: "error" },
  failed: { label: "Failed", tone: "error" },
  disconnected: { label: "Disconnected", tone: "neutral" },
};
