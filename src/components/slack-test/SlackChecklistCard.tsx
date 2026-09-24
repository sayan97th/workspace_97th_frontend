import React from "react";
import { format } from "date-fns";
import { CheckCircleIcon, ClockIcon, RefreshIcon, XCircleIcon } from "@/components/websocket-test/icons";
import { TONE_CLASSES, type StatusTone } from "@/components/websocket-test/status-meta";
import type { SlackDiagnosticStatus, SlackDiagnosticsDto } from "@/types/slack";

type SlackChecklistCardProps = {
  diagnostics: SlackDiagnosticsDto | null;
  is_running: boolean;
  run_error: string | null;
  onRun: () => void;
};

const STATUS_META: Record<SlackDiagnosticStatus, { tone: StatusTone; label: string }> = {
  passed: { tone: "success", label: "Passed" },
  warning: { tone: "warning", label: "Warning" },
  failed: { tone: "error", label: "Failed" },
  skipped: { tone: "neutral", label: "Skipped" },
};

const StatusIcon: React.FC<{ status: SlackDiagnosticStatus }> = ({ status }) => {
  const class_name = `mt-0.5 flex-none ${TONE_CLASSES[STATUS_META[status].tone].text}`;

  if (status === "passed") return <CheckCircleIcon size={16} className={class_name} />;
  if (status === "failed") return <XCircleIcon size={16} className={class_name} />;
  return <ClockIcon size={16} className={class_name} />;
};

/** Every server side Slack check with its result, in dependency order. */
const SlackChecklistCard: React.FC<SlackChecklistCardProps> = ({ diagnostics, is_running, run_error, onRun }) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-shell-text">Connection checks</div>
          <div className="text-xs text-shell-text-faint">
            {diagnostics ? `Last run ${format(new Date(diagnostics.ran_at), "MMM d, yyyy h:mm:ss a")}` : "Checks run on the API server."}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {diagnostics ? (
            <div className="flex gap-1.5">
              {(Object.keys(STATUS_META) as SlackDiagnosticStatus[]).map((status) =>
                diagnostics.summary[status] > 0 ? (
                  <span
                    key={status}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[STATUS_META[status].tone].bg} ${TONE_CLASSES[STATUS_META[status].tone].text}`}
                  >
                    {diagnostics.summary[status]} {STATUS_META[status].label.toLowerCase()}
                  </span>
                ) : null
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onRun}
            disabled={is_running}
            className="inline-flex items-center gap-1.5 rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
          >
            <RefreshIcon size={13} className={is_running ? "animate-spin" : undefined} />
            {is_running ? "Running…" : "Run again"}
          </button>
        </div>
      </div>

      {run_error ? (
        <div role="alert" className="rounded-lg border border-error-300 bg-error-50 px-3 py-2 text-xs text-error-600">
          {run_error}
        </div>
      ) : null}

      {!diagnostics && is_running ? <div className="text-xs text-shell-text-faint">Running checks…</div> : null}

      {diagnostics ? (
        <ul className="divide-y divide-shell-border">
          {diagnostics.checks.map((check) => (
            <li key={check.key} className="flex items-start gap-3 py-3">
              <StatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[13px] font-medium ${check.status === "skipped" ? "text-shell-text-faint" : "text-shell-text"}`}>
                    {check.label}
                  </span>
                  <span className={`text-[11px] font-semibold ${TONE_CLASSES[STATUS_META[check.status].tone].text}`}>
                    {STATUS_META[check.status].label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-shell-text-secondary">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default SlackChecklistCard;
