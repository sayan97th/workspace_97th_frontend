import React, { useState } from "react";
import { CheckCircleIcon, ClockIcon, RefreshIcon, XCircleIcon } from "@/components/websocket-test/icons";
import { TONE_CLASSES, type StatusTone } from "@/components/websocket-test/status-meta";
import type { SlackDiagnosticStatus, SlackNotificationTestDto, SlackNotificationTestResultDto, SlackNotificationTestTarget } from "@/types/slack";

type SlackNotificationTestRowProps = {
  test: SlackNotificationTestDto;
  result: SlackNotificationTestResultDto | null;
  is_running: boolean;
  /** Why the test cannot run right now, null when it can. */
  blocker: string | null;
  is_disabled: boolean;
  onRun: () => void;
};

export const RESULT_STATUS_META: Record<SlackDiagnosticStatus, { tone: StatusTone; label: string }> = {
  passed: { tone: "success", label: "Passed" },
  warning: { tone: "warning", label: "Warning" },
  failed: { tone: "error", label: "Failed" },
  skipped: { tone: "neutral", label: "Skipped" },
};

const TARGET_LABELS: Record<SlackNotificationTestTarget, string | null> = {
  none: null,
  user: "Recipient",
  channel: "Channel",
  user_and_channel: "Recipient and channel",
  slack_member: "Slack member",
};

const ResultIcon: React.FC<{ status: SlackDiagnosticStatus | null; is_running: boolean }> = ({ status, is_running }) => {
  if (is_running) return <RefreshIcon size={16} className="mt-0.5 flex-none animate-spin text-brand-300" />;
  if (status === null) return <span className="mt-1 h-3.5 w-3.5 flex-none rounded-full border-2 border-shell-border" aria-hidden="true" />;

  const class_name = `mt-0.5 flex-none ${TONE_CLASSES[RESULT_STATUS_META[status].tone].text}`;
  if (status === "passed") return <CheckCircleIcon size={16} className={class_name} />;
  if (status === "failed") return <XCircleIcon size={16} className={class_name} />;
  return <ClockIcon size={16} className={class_name} />;
};

/** One test of the suite: what it does and needs, a Run button, and its last result with every Slack call it made. */
const SlackNotificationTestRow: React.FC<SlackNotificationTestRowProps> = ({ test, result, is_running, blocker, is_disabled, onRun }) => {
  const [is_expanded, setIsExpanded] = useState(false);
  const status = result?.status ?? null;
  const target_label = TARGET_LABELS[test.target];

  return (
    <li className="flex items-start gap-3 py-3.5">
      <ResultIcon status={status} is_running={is_running} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-shell-text">{test.label}</span>
          {status ? (
            <span className={`text-[11px] font-semibold ${TONE_CLASSES[RESULT_STATUS_META[status].tone].text}`}>{RESULT_STATUS_META[status].label}</span>
          ) : null}
          {target_label ? (
            <span className="rounded-md bg-shell-panel-alt px-1.5 py-0.5 text-[10.5px] font-medium text-shell-text-secondary">{target_label}</span>
          ) : null}
          {test.sends_message ? null : (
            <span className="rounded-md bg-shell-panel-alt px-1.5 py-0.5 text-[10.5px] font-medium text-shell-text-secondary">Read only</span>
          )}
        </div>

        <p className="mt-0.5 text-xs leading-relaxed text-shell-text-secondary">{test.description}</p>

        {test.required_scopes.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {test.required_scopes.map((scope) => {
              const is_missing = test.missing_scopes.includes(scope);
              return (
                <code
                  key={scope}
                  title={is_missing ? "The workspace was installed without this scope" : "Granted"}
                  className={`rounded px-1.5 py-0.5 text-[10.5px] ${is_missing ? `${TONE_CLASSES.error.bg} ${TONE_CLASSES.error.text}` : "bg-shell-panel-alt text-shell-text-faint"}`}
                >
                  {scope}
                </code>
              );
            })}
          </div>
        ) : null}

        {result ? (
          <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].border} ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].bg}`}>
            <div className={`leading-relaxed ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].text}`}>{result.detail}</div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              {result.links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-200 hover:underline">
                  {link.label}
                </a>
              ))}
              {result.steps.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  aria-expanded={is_expanded}
                  className="font-semibold text-shell-text-secondary hover:underline"
                >
                  {is_expanded ? "Hide" : "Show"} {result.steps.length} {result.steps.length === 1 ? "step" : "steps"}
                </button>
              ) : null}
              {result.duration_ms > 0 ? <span className="text-shell-text-faint">{result.duration_ms} ms</span> : null}
            </div>

            {is_expanded ? (
              <ol className="mt-2 flex flex-col gap-1 border-t border-shell-border pt-2">
                {result.steps.map((step, index) => (
                  <li key={`${step.name}-${index}`} className="flex items-baseline gap-2 text-[11px]">
                    <span className={`h-1.5 w-1.5 flex-none translate-y-[-1px] rounded-full ${TONE_CLASSES[RESULT_STATUS_META[step.status].tone].dot}`} aria-hidden="true" />
                    <code className="font-semibold text-shell-text">{step.name}</code>
                    <span className="text-shell-text-secondary">{step.detail ?? RESULT_STATUS_META[step.status].label.toLowerCase()}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : blocker ? (
          <p className="mt-1.5 text-[11px] text-shell-text-faint">{blocker}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={is_disabled || blocker !== null}
        title={blocker ?? undefined}
        className="flex-none rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
      >
        {is_running ? "Running…" : result ? "Run again" : "Run"}
      </button>
    </li>
  );
};

export default SlackNotificationTestRow;
