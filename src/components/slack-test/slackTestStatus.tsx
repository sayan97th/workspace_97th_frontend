import React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react";
import type { SlackDiagnosticStatus } from "@/types/slack";

type StatusMeta = {
  label: string;
  /** `admin-pill` modifier from administration.css. */
  pill_class: string;
  /** Text color of the status icon and inline status text. */
  text_class: string;
  /** Notice background for a result box. */
  notice_class: string;
};

/** How a check or test result reads everywhere in the Slack testing area, built on the Administration tokens. */
export const STATUS_META: Record<SlackDiagnosticStatus, StatusMeta> = {
  passed: { label: "Passed", pill_class: "admin-pill-success", text_class: "text-[var(--admin-success-text)]", notice_class: "admin-notice-success" },
  warning: { label: "Warning", pill_class: "admin-pill-warning", text_class: "text-[var(--admin-warning-text)]", notice_class: "admin-notice-warning" },
  failed: { label: "Failed", pill_class: "admin-pill-danger", text_class: "text-[var(--admin-danger-text)]", notice_class: "admin-notice-error" },
  skipped: {
    label: "Skipped",
    pill_class: "bg-[var(--admin-neutral-bg)] text-[var(--admin-text-secondary)]",
    text_class: "text-[var(--admin-text-faint)]",
    notice_class: "admin-notice-neutral",
  },
};

export const STATUS_ORDER: SlackDiagnosticStatus[] = ["passed", "warning", "failed", "skipped"];

export const StatusPill: React.FC<{ status: SlackDiagnosticStatus; count?: number }> = ({ status, count }) => (
  <span className={`admin-pill ${STATUS_META[status].pill_class}`}>
    {count === undefined ? STATUS_META[status].label : `${count} ${STATUS_META[status].label.toLowerCase()}`}
  </span>
);

/** The status icon of a check or test, a spinner while it runs and an empty ring before its first run. */
export const StatusIcon: React.FC<{ status: SlackDiagnosticStatus | null; is_running?: boolean; size?: number }> = ({ status, is_running = false, size = 18 }) => {
  const class_name = "mt-px flex-none";

  if (is_running) return <Loader2 size={size} strokeWidth={2} className={`${class_name} animate-spin text-[var(--admin-accent)]`} aria-label="Running" />;
  if (status === null) {
    return <span className={`${class_name} rounded-full border-2 border-[var(--admin-border)]`} style={{ width: size, height: size }} aria-hidden="true" />;
  }

  const tone = `${class_name} ${STATUS_META[status].text_class}`;
  if (status === "passed") return <CheckCircle2 size={size} strokeWidth={2} className={tone} aria-hidden="true" />;
  if (status === "warning") return <AlertTriangle size={size} strokeWidth={2} className={tone} aria-hidden="true" />;
  if (status === "failed") return <XCircle size={size} strokeWidth={2} className={tone} aria-hidden="true" />;
  return <MinusCircle size={size} strokeWidth={2} className={tone} aria-hidden="true" />;
};

/** Count chips for a summary, only the statuses that occurred. */
export const StatusSummary: React.FC<{ summary: Record<SlackDiagnosticStatus, number> }> = ({ summary }) => (
  <div className="flex flex-wrap gap-1.5">
    {STATUS_ORDER.map((status) => (summary[status] > 0 ? <StatusPill key={status} status={status} count={summary[status]} /> : null))}
  </div>
);
