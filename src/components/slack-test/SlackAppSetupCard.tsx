import React, { useState } from "react";
import type { SlackAppSetupDto } from "@/types/slack";

type SlackAppSetupCardProps = {
  app: SlackAppSetupDto | null;
};

const SetupRow: React.FC<{ label: string; value: string | null; hint: string }> = ({ label, value, hint }) => {
  const [is_copied, setIsCopied] = useState(false);

  const copyValue = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked, the value stays selectable on screen.
    }
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-shell-text-secondary">{label}</span>
        <button
          type="button"
          onClick={() => void copyValue()}
          disabled={!value}
          className="text-[11px] font-semibold text-brand-200 hover:underline disabled:cursor-default disabled:opacity-50"
        >
          {is_copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-1 break-all font-mono text-xs text-shell-text">{value || "Not set"}</div>
      <div className="mt-1 text-[11px] text-shell-text-faint">{hint}</div>
    </div>
  );
};

/** The values an administrator has to enter in the Slack app settings at api.slack.com/apps. */
const SlackAppSetupCard: React.FC<SlackAppSetupCardProps> = ({ app }) => {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div>
        <div className="text-sm font-semibold text-shell-text">Slack app settings</div>
        <div className="text-xs text-shell-text-faint">Enter these in your Slack app at api.slack.com/apps.</div>
      </div>

      <div className="divide-y divide-shell-border">
        <SetupRow label="Client ID" value={app?.client_id ?? null} hint="From SLACK_CLIENT_ID, must match Basic Information in Slack." />
        <SetupRow label="Redirect URL" value={app?.redirect_uri ?? null} hint="OAuth & Permissions, Redirect URLs." />
        <SetupRow label="Events request URL" value={app?.events_url ?? null} hint="Event Subscriptions, Request URL. Saving it proves the signing secret." />
      </div>

      {app ? (
        <div className="flex flex-col gap-2 pt-1">
          <ScopeList label="Bot token scopes" scopes={app.bot_scopes} />
          <ScopeList label="User token scopes" scopes={app.user_scopes} />
        </div>
      ) : null}
    </div>
  );
};

const ScopeList: React.FC<{ label: string; scopes: string[] }> = ({ label, scopes }) => (
  <div>
    <div className="text-xs font-medium text-shell-text-secondary">{label}</div>
    <div className="mt-1 flex flex-wrap gap-1.5">
      {scopes.map((scope) => (
        <span key={scope} className="rounded-md bg-shell-panel-alt px-2 py-0.5 font-mono text-[11px] text-shell-text">
          {scope}
        </span>
      ))}
    </div>
  </div>
);

export default SlackAppSetupCard;
