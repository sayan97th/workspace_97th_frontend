import React, { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { SlackNotificationTestDto, SlackNotificationTestResultDto, SlackNotificationTestTarget } from "@/types/slack";
import { STATUS_META, StatusIcon } from "./slackTestStatus";
import { CHIP } from "./slackTestStyles";

type SlackNotificationTestRowProps = {
  test: SlackNotificationTestDto;
  result: SlackNotificationTestResultDto | null;
  is_running: boolean;
  /** Why the test cannot run right now, null when it can. */
  blocker: string | null;
  is_disabled: boolean;
  onRun: () => void;
};

const TARGET_LABELS: Record<SlackNotificationTestTarget, string | null> = {
  none: null,
  user: "Recipient",
  channel: "Channel",
  user_and_channel: "Recipient and channel",
  slack_member: "Slack member",
};

/** The colored dot of one step, the same tones as the result. */
const STEP_DOT: Record<SlackNotificationTestResultDto["status"], string> = {
  passed: "bg-[var(--admin-success-text)]",
  warning: "bg-[var(--admin-warning-text)]",
  failed: "bg-[var(--admin-danger-text)]",
  skipped: "bg-[var(--admin-text-faint)]",
};

/** Result box of a test: Slack's answer, links to what it produced, and every call it made on demand. */
const TestResult: React.FC<{ result: SlackNotificationTestResultDto }> = ({ result }) => {
  const [is_expanded, setIsExpanded] = useState(false);
  const meta = STATUS_META[result.status];

  return (
    <div className={`admin-notice mt-2 flex-col gap-1.5 ${meta.notice_class}`}>
      <div className="leading-5">{result.detail}</div>

      {result.links.length > 0 || result.steps.length > 0 || result.duration_ms > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          {result.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="admin-link inline-flex items-center gap-1">
              {link.label}
              <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ))}
          {result.steps.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              aria-expanded={is_expanded}
              className="inline-flex items-center gap-1 font-medium text-shell-text-secondary hover:text-shell-text"
            >
              {is_expanded ? "Hide" : "Show"} {result.steps.length} {result.steps.length === 1 ? "step" : "steps"}
              <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform ${is_expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          ) : null}
          {result.duration_ms > 0 ? <span className="text-shell-text-faint">{result.duration_ms} ms</span> : null}
        </div>
      ) : null}

      {is_expanded ? (
        <ol className="mt-1 flex flex-col gap-1 border-t border-[var(--admin-divider)] pt-2">
          {result.steps.map((step, index) => (
            <li key={`${step.name}-${index}`} className="flex items-baseline gap-2 text-[12.5px]">
              <span className={`h-1.5 w-1.5 flex-none translate-y-[-1px] rounded-full ${STEP_DOT[step.status]}`} aria-hidden="true" />
              <code className="font-semibold text-shell-text">{step.name}</code>
              <span className="text-shell-text-secondary">{step.detail ?? STATUS_META[step.status].label.toLowerCase()}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};

/** One test of the suite: what it does and needs, a Run button, and its last result. */
const SlackNotificationTestRow: React.FC<SlackNotificationTestRowProps> = ({ test, result, is_running, blocker, is_disabled, onRun }) => {
  const status = result?.status ?? null;
  const target_label = TARGET_LABELS[test.target];

  return (
    <li className="flex items-start gap-3 py-3.5">
      <StatusIcon status={status} is_running={is_running} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-medium text-shell-text">{test.label}</span>
          {status ? <span className={`text-[12px] font-semibold ${STATUS_META[status].text_class}`}>{STATUS_META[status].label}</span> : null}
          {target_label ? <span className={CHIP}>{target_label}</span> : null}
          {test.sends_message ? null : <span className={CHIP}>Read only</span>}
        </div>

        <p className="mt-0.5 text-[13px] leading-[19px] text-shell-text-secondary">{test.description}</p>

        {test.required_scopes.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {test.required_scopes.map((scope) => {
              const is_missing = test.missing_scopes.includes(scope);
              return (
                <code
                  key={scope}
                  title={is_missing ? "The workspace was installed without this scope" : "Granted"}
                  className={`rounded-[4px] px-1.5 py-0.5 text-[11.5px] ${
                    is_missing ? "bg-[var(--admin-danger-bg)] text-[var(--admin-danger-text)]" : "bg-[var(--admin-neutral-bg)] text-shell-text-faint"
                  }`}
                >
                  {scope}
                </code>
              );
            })}
          </div>
        ) : null}

        {result ? <TestResult result={result} /> : blocker ? <p className="mt-1.5 text-[13px] text-shell-text-faint">{blocker}</p> : null}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={is_disabled || blocker !== null}
        title={blocker ?? undefined}
        aria-label={`${result ? "Run again" : "Run"}: ${test.label}`}
        className="admin-button admin-button-secondary h-8 px-3 text-[13px]"
      >
        {is_running ? "Running…" : result ? "Run again" : "Run"}
      </button>
    </li>
  );
};

export default SlackNotificationTestRow;
