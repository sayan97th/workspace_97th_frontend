import React from "react";
import { format } from "date-fns";
import type { SlackDiagnosticsDto } from "@/types/slack";
import { STATUS_META, StatusIcon, StatusSummary } from "./slackTestStatus";
import { CARD, CARD_HEADER, CARD_HINT, CARD_TITLE, ROW_LIST } from "./slackTestStyles";

type SlackChecklistCardProps = {
  diagnostics: SlackDiagnosticsDto | null;
  is_running: boolean;
  run_error: string | null;
};

/** Every server side Slack check with its result, in dependency order. "Run checks" lives in the page header. */
const SlackChecklistCard: React.FC<SlackChecklistCardProps> = ({ diagnostics, is_running, run_error }) => (
  <section className={CARD} aria-busy={is_running}>
    <div className={CARD_HEADER}>
      <div className="min-w-0">
        <h3 className={CARD_TITLE}>Connection checks</h3>
        <p className={CARD_HINT}>
          {diagnostics ? `Last run ${format(new Date(diagnostics.ran_at), "MMM d, yyyy 'at' h:mm:ss a")}` : "Every check runs live on the API server."}
        </p>
      </div>
      {diagnostics ? <StatusSummary summary={diagnostics.summary} /> : null}
    </div>

    {run_error ? (
      <div role="alert" className="admin-notice admin-notice-error mt-4">
        {run_error}
      </div>
    ) : null}

    {!diagnostics && is_running ? <p className="mt-4 text-[14px] text-shell-text-faint">Running checks…</p> : null}

    {diagnostics ? (
      <ul className={`${ROW_LIST} transition-opacity ${is_running ? "opacity-60" : ""}`}>
        {diagnostics.checks.map((check) => (
          <li key={check.key} className="flex items-start gap-3 py-3">
            <StatusIcon status={check.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`text-[14px] font-medium ${check.status === "skipped" ? "text-shell-text-faint" : "text-shell-text"}`}>{check.label}</span>
                <span className={`text-[12px] font-semibold ${STATUS_META[check.status].text_class}`}>{STATUS_META[check.status].label}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-[19px] text-shell-text-secondary">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    ) : null}
  </section>
);

export default SlackChecklistCard;
