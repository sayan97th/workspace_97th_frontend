"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackSelectableAppSource } from "@/types/slack";
import {
  FIELD_LABEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SECTION_CARD,
  SECTION_HINT,
  SECTION_TITLE,
  TEXT_INPUT,
} from "@/components/administration/slack/slackAdminStyles";

export type SlackAppCredentialsCardProps = {
  admin: SlackAdministrationApi;
};

/** The environment variables the production app is read from, listed when one is missing. */
const ENVIRONMENT_VARIABLES = ["SLACK_APP_ID", "SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"];

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label = "Copy" }) => {
  const [is_copied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <button type="button" onClick={() => void copy()} className={`${SECONDARY_BUTTON} flex-none !px-3 !py-[7px] !text-[12px]`}>
      {is_copied ? "Copied" : label}
    </button>
  );
};

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className={FIELD_LABEL}>{label}</div>
    <div className="mt-1.5 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-[8px] border border-shell-border bg-shell-panel px-3 py-[7px] text-[12px] text-shell-text-secondary">{value}</code>
      <CopyButton value={value} />
    </div>
  </div>
);

type AppOptionProps = {
  name: string;
  kind_label: string;
  is_active: boolean;
  details: string[];
  /** Shown instead of the details while the app is not set up. */
  empty_message?: React.ReactNode;
  children?: React.ReactNode;
};

/** One of the two Slack apps, with whether it is in use and its actions. */
const AppOption: React.FC<AppOptionProps> = ({ name, kind_label, is_active, details, empty_message, children }) => (
  <li
    className={`rounded-lg border p-4 ${
      is_active ? "border-[var(--admin-button-primary)] bg-[var(--admin-button-primary)]/[0.05]" : "border-[var(--admin-list-border)] bg-shell-panel"
    }`}
  >
    <div className="flex flex-wrap items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-1 flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 ${
          is_active ? "border-[var(--admin-button-primary)]" : "border-shell-border-strong"
        }`}
      >
        {is_active ? <span className="h-2 w-2 rounded-full bg-[var(--admin-button-primary)]" /> : null}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-shell-text">{name}</span>
          <span className="rounded-md bg-shell-hover px-2 py-0.5 text-[11px] font-bold text-shell-text-secondary">{kind_label}</span>
          {is_active ? <span className="admin-pill admin-pill-success">In use</span> : null}
        </div>
        {empty_message ? (
          <div className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">{empty_message}</div>
        ) : (
          <div className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">{details.filter(Boolean).join(" · ")}</div>
        )}
      </div>

      {children ? <div className="flex flex-none flex-wrap gap-2">{children}</div> : null}
    </div>
  </li>
);

function secretDetails(credentials: { client_id: string | null; client_secret_hint: string | null; signing_secret_hint: string | null }): string[] {
  return [
    credentials.client_id ? `Client ID ${credentials.client_id}` : "",
    credentials.client_secret_hint ? `Client secret ${credentials.client_secret_hint}` : "No client secret",
    credentials.signing_secret_hint ? `Signing secret ${credentials.signing_secret_hint}` : "No signing secret",
  ];
}

/**
 * Administration > Integrations > Slack > Slack app, administrators and the account owner.
 *
 * Two apps, like a production and a staging environment. The production 97th Floor app is read
 * from the API .env file (SLACK_* variables) and is read only here. The testing app, for example
 * the Make It Simple app, is saved from this card so changes can be tried without messaging the
 * 97th Floor workspace. An administrator switches between them and the active workspace follows.
 */
const SlackAppCredentialsCard: React.FC<SlackAppCredentialsCardProps> = ({ admin }) => {
  const credentials = admin.credentials;
  const [is_open, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [client_id, setClientId] = useState("");
  const [client_secret, setClientSecret] = useState("");
  const [signing_secret, setSigningSecret] = useState("");
  const [redirect_uri, setRedirectUri] = useState("");
  const [is_confirming_clear, setIsConfirmingClear] = useState(false);
  const [configuration_token, setConfigurationToken] = useState("");
  const [is_manual, setIsManual] = useState(false);

  // Opens on its own while no app is set at all, there is nothing else to do on the page until then.
  useEffect(() => {
    if (credentials && !credentials.is_configured) setIsOpen(true);
  }, [credentials]);

  useEffect(() => {
    if (!credentials) return;
    setLabel(credentials.testing_app?.label ?? "");
    setClientId(credentials.testing_app?.client_id ?? "");
    setRedirectUri(credentials.redirect_uri_override ?? "");
    setClientSecret("");
    setSigningSecret("");
  }, [credentials]);

  if (!credentials) return null;

  const environment_app = credentials.environment_app;
  const testing_app = credentials.testing_app;
  const is_saved_app = testing_app !== null && client_id.trim() === testing_app.client_id;
  const is_saving = admin.busy_key === "credentials";
  const is_switching = admin.busy_key === "select_app";
  const can_save = client_id.trim() !== "" && (is_saved_app || client_secret.trim() !== "");
  const manifest_json = JSON.stringify(credentials.manifest, null, 2);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const is_saved = await admin.saveCredentials({
      label: label.trim() || null,
      client_id: client_id.trim(),
      client_secret: client_secret.trim() || null,
      signing_secret: signing_secret.trim() || null,
      redirect_uri: redirect_uri.trim() || null,
    });
    if (is_saved) setIsOpen(false);
  };

  const createApp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await admin.createApp(configuration_token.trim())) {
      setConfigurationToken("");
      setIsManual(false);
    }
  };

  const clear = async () => {
    if (await admin.clearCredentials()) {
      setIsConfirmingClear(false);
      setIsOpen(false);
    }
  };

  const selectApp = (source: SlackSelectableAppSource) => void admin.selectApp(source);

  return (
    <section className={SECTION_CARD}>
      <div className="min-w-0">
        <h3 className={SECTION_TITLE}>Slack app</h3>
        <p className={SECTION_HINT}>
          Production uses the {environment_app.name} Slack app set on the server. Switch to a testing app to try changes without messaging the{" "}
          {environment_app.name} workspace.
        </p>
      </div>

      {credentials.source === "database" && environment_app.is_configured ? (
        <div className="mt-4 admin-notice admin-notice-warning">
          <span className="font-bold">Testing app in use.</span> Notifications and automations go through {testing_app?.label ?? "the testing app"}. Switch back to{" "}
          {environment_app.name} when you finish testing.
        </div>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        <AppOption
          name={environment_app.name}
          kind_label="Production"
          is_active={environment_app.is_active}
          details={[...secretDetails(environment_app), "Set in the API .env file"]}
          empty_message={
            environment_app.is_configured ? undefined : (
              <>
                Not set on the server. Add {ENVIRONMENT_VARIABLES.map((variable, index) => (
                  <React.Fragment key={variable}>
                    {index > 0 ? ", " : ""}
                    <code className="text-[12px]">{variable}</code>
                  </React.Fragment>
                ))}{" "}
                to the API .env file.
              </>
            )
          }
        >
          {environment_app.is_configured && !environment_app.is_active ? (
            <button type="button" onClick={() => selectApp("environment")} disabled={admin.busy_key !== null} className={PRIMARY_BUTTON}>
              {is_switching ? "Switching…" : "Use this app"}
            </button>
          ) : null}
          {environment_app.app_settings_url ? (
            <a href={environment_app.app_settings_url} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
              Open in Slack
            </a>
          ) : null}
        </AppOption>

        <AppOption
          name={testing_app?.label ?? "Testing app"}
          kind_label="Testing"
          is_active={testing_app?.is_active ?? false}
          details={
            testing_app
              ? [
                  ...secretDetails(testing_app),
                  testing_app.updated_by || testing_app.updated_at
                    ? `Updated${testing_app.updated_by ? ` by ${testing_app.updated_by}` : ""}${
                        testing_app.updated_at ? ` on ${format(new Date(testing_app.updated_at), "MMM d, yyyy")}` : ""
                      }`
                    : "",
                ]
              : []
          }
          empty_message={testing_app ? undefined : "Optional. Save a second Slack app, for example the Make It Simple app, to test without reaching production."}
        >
          {testing_app && !testing_app.is_active ? (
            <button type="button" onClick={() => selectApp("database")} disabled={admin.busy_key !== null} className={PRIMARY_BUTTON}>
              {is_switching ? "Switching…" : "Use this app"}
            </button>
          ) : null}
          <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={is_open} className={SECONDARY_BUTTON}>
            {is_open ? "Close" : testing_app ? "Edit" : "Add testing app"}
          </button>
          {testing_app && !is_confirming_clear ? (
            <button type="button" onClick={() => setIsConfirmingClear(true)} disabled={admin.busy_key !== null} className={SECONDARY_BUTTON}>
              Remove
            </button>
          ) : null}
        </AppOption>
      </ul>

      {is_confirming_clear ? (
        <div className="mt-4 rounded-[9px] border border-[#e2445c]/25 bg-[#e2445c]/[0.06] p-3.5">
          <div className="text-[13px] font-bold text-shell-text">Remove the testing app?</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            {environment_app.is_configured
              ? `Slack goes back to the ${environment_app.name} app. Workspaces added with the testing app stay connected until you disconnect them.`
              : "No Slack app is set on the server, so no new workspace can be connected until a testing app is saved again."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void clear()}
              disabled={is_saving}
              className="rounded-[4px] bg-[#d83a52] px-4 py-[9px] text-[14px] font-medium text-white transition-colors hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
            >
              {is_saving ? "Removing…" : "Remove"}
            </button>
            <button type="button" onClick={() => setIsConfirmingClear(false)} className={SECONDARY_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {credentials.is_configured ? (
        <div className="mt-4">
          <div className="text-[13px] font-bold text-shell-text">URLs to register in the {credentials.app_name ?? "Slack"} app</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CopyField label="Redirect URL" value={credentials.redirect_uri} />
            <CopyField label="Events request URL" value={credentials.events_url} />
          </div>
        </div>
      ) : null}

      {credentials.is_configured && credentials.distribution_url ? (
        <div className="mt-4 admin-notice admin-notice-info">
          <span className="font-bold">Adding more workspaces:</span> to add the {credentials.app_name ?? "Slack"} app to a workspace other than the one it
          was created in, open{" "}
          <a href={credentials.distribution_url} target="_blank" rel="noopener noreferrer" className="admin-link">
            Manage Distribution
          </a>{" "}
          and click Activate Public Distribution. Slack requires an HTTPS redirect URL for that.
        </div>
      ) : null}

      {is_open ? (
        <div className="mt-4 border-t border-shell-border pt-4">
          <div className="text-[14px] font-semibold text-shell-text">{testing_app ? `Edit ${testing_app.label ?? "the testing app"}` : "Add a testing app"}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            Saving does not switch to it. Use &quot;Use this app&quot; above when you want to test with it.
          </p>

          <form onSubmit={(event) => void save(event)} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={FIELD_LABEL}>Name</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Make It Simple" maxLength={80} autoComplete="off" className={TEXT_INPUT} />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Client ID</span>
              <input value={client_id} onChange={(event) => setClientId(event.target.value)} placeholder="1234567890.1234567890" autoComplete="off" className={TEXT_INPUT} />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Client secret</span>
              <input
                type="password"
                value={client_secret}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder={is_saved_app && testing_app?.client_secret_hint ? `Saved ${testing_app.client_secret_hint}, leave blank to keep` : "Client secret"}
                autoComplete="new-password"
                className={TEXT_INPUT}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Signing secret</span>
              <input
                type="password"
                value={signing_secret}
                onChange={(event) => setSigningSecret(event.target.value)}
                placeholder={is_saved_app && testing_app?.signing_secret_hint ? `Saved ${testing_app.signing_secret_hint}, leave blank to keep` : "Signing secret"}
                autoComplete="new-password"
                className={TEXT_INPUT}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={FIELD_LABEL}>Redirect URL override (optional)</span>
              <input
                value={redirect_uri}
                onChange={(event) => setRedirectUri(event.target.value)}
                placeholder={credentials.default_redirect_uri}
                autoComplete="off"
                className={TEXT_INPUT}
              />
            </label>

            <p className="text-[12px] leading-relaxed text-shell-text-faint sm:col-span-2">
              The values are on the Basic Information page of the Slack app, under App Credentials. Slack only accepts HTTPS redirect URLs for
              &quot;Connect my Slack&quot;, use the override when the API is reached through a tunnel.
            </p>

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={!can_save || is_saving} className={PRIMARY_BUTTON}>
                {is_saving ? "Saving…" : "Save testing app"}
              </button>
            </div>
          </form>

          <button type="button" onClick={() => setIsManual((manual) => !manual)} aria-expanded={is_manual} className="mt-5 text-[12.5px] admin-link">
            {is_manual ? "Hide the other ways to create a testing app" : "Do not have a testing app yet? Create one"}
          </button>

          {is_manual ? (
            <div className="mt-4 flex flex-col gap-5">
              <form onSubmit={(event) => void createApp(event)}>
                <div className="text-[13px] font-bold text-shell-text">Create it with a configuration token</div>
                <ol className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-shell-text-muted">
                  <li>
                    1. Open{" "}
                    <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="admin-link">
                      api.slack.com/apps
                    </a>{" "}
                    and, under &quot;Your App Configuration Tokens&quot;, click Generate Token.
                  </li>
                  <li>2. Choose the workspace you test in, for example Make It Simple, and click Generate.</li>
                  <li>3. Copy the Access Token (it starts with xoxe.xoxp-) and paste it here. It is used once and never stored.</li>
                </ol>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={configuration_token}
                    onChange={(event) => setConfigurationToken(event.target.value)}
                    placeholder="xoxe.xoxp-..."
                    autoComplete="off"
                    aria-label="App configuration access token"
                    className={`${TEXT_INPUT} !mt-0 flex-1`}
                  />
                  <button type="submit" disabled={!configuration_token.trim().startsWith("xoxe.xoxp-") || is_saving} className={`${PRIMARY_BUTTON} flex-none`}>
                    {is_saving ? "Creating…" : "Create testing app"}
                  </button>
                </div>
                {testing_app ? (
                  <p className="mt-2 text-[12px] text-shell-text-faint">Creating a new app replaces the current testing app.</p>
                ) : null}
                {!credentials.can_receive_events ? (
                  <p className="mt-2 text-[12px] text-shell-text-faint">
                    This API is not reachable from the internet, so the app is created without event subscriptions. Removing the app from a workspace is
                    then only noticed on the next message.
                  </p>
                ) : null}
              </form>

              <div>
                <div className="text-[13px] font-bold text-shell-text">Or create it from this manifest</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
                  Open{" "}
                  <a href="https://api.slack.com/apps?new_app=1" target="_blank" rel="noopener noreferrer" className="admin-link">
                    api.slack.com/apps
                  </a>
                  , choose &quot;From a manifest&quot;, pick the workspace you test in and paste it. It already has the redirect URL, events URL and
                  permissions. Then paste the credentials in the form above.
                </p>
                <div className="mt-2 flex items-start gap-2">
                  <pre className="max-h-[140px] min-w-0 flex-1 overflow-auto rounded-[8px] border border-shell-border bg-shell-panel px-3 py-2 text-[11.5px] text-shell-text-secondary">
                    {manifest_json}
                  </pre>
                  <CopyButton value={manifest_json} label="Copy manifest" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default SlackAppCredentialsCard;
