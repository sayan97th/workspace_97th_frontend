import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { SlackAppSetupDto } from "@/types/slack";
import { CARD, CARD_HINT, CARD_TITLE, CHIP, FIELD_HINT, ROW_LIST } from "./slackTestStyles";

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
        <span className="text-[14px] font-medium text-shell-text">{label}</span>
        <button
          type="button"
          onClick={() => void copyValue()}
          disabled={!value}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[13px] text-[var(--admin-accent)] transition-colors hover:bg-[var(--admin-hover)] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {is_copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
          {is_copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-1.5 break-all rounded-[4px] bg-[var(--admin-neutral-bg)] px-2.5 py-1.5 font-mono text-[12.5px] text-shell-text">{value || "Not set"}</div>
      <p className={`mt-1 ${FIELD_HINT}`}>{hint}</p>
    </div>
  );
};

const ScopeList: React.FC<{ label: string; scopes: string[] }> = ({ label, scopes }) => (
  <div>
    <div className="text-[14px] font-medium text-shell-text">{label}</div>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {scopes.map((scope) => (
        <code key={scope} className={CHIP}>
          {scope}
        </code>
      ))}
    </div>
  </div>
);

/** The values an administrator enters in the Slack app at api.slack.com/apps, for the app in use. */
const SlackAppSetupCard: React.FC<SlackAppSetupCardProps> = ({ app }) => (
  <section className={CARD}>
    <h3 className={CARD_TITLE}>Slack app settings</h3>
    <p className={CARD_HINT}>
      {app?.app_name ? `Values for the ${app.app_name} app. ` : ""}Enter them in the Slack app at api.slack.com/apps.
    </p>

    <div className={ROW_LIST}>
      <SetupRow label="Client ID" value={app?.client_id ?? null} hint="Must match Basic Information in the Slack app." />
      <SetupRow
        label="Redirect URL"
        value={app?.redirect_uri ?? null}
        hint={
          app?.link_method === "authorize"
            ? "OAuth & Permissions, Redirect URLs. Not HTTPS, so Connect my Slack uses a Slack authorization instead of Sign in with Slack."
            : "OAuth & Permissions, Redirect URLs."
        }
      />
      <SetupRow label="Events request URL" value={app?.events_url ?? null} hint="Event Subscriptions, Request URL. Saving it proves the signing secret." />
    </div>

    {app ? (
      <details className="group mt-1 border-t border-[var(--admin-divider)] pt-3">
        <summary className="cursor-pointer select-none text-[14px] font-medium text-[var(--admin-accent)] hover:underline">
          Scopes the app requests ({app.bot_scopes.length + app.user_scopes.length})
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <ScopeList label="Bot token scopes" scopes={app.bot_scopes} />
          <ScopeList label="User token scopes" scopes={app.user_scopes} />
        </div>
      </details>
    ) : null}
  </section>
);

export default SlackAppSetupCard;
