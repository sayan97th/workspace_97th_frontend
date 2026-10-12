"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackAppOptionDto } from "@/types/slack";
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

/** The environment variables the 97th Floor app is read from, listed when one is missing. */
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

/** What the credentials form edits: a new app, or the saved app with this id. */
type FormTarget = "new" | number | null;

type AppRowProps = {
  app: SlackAppOptionDto;
  admin: SlackAdministrationApi;
  is_confirming_remove: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
};

function appDetails(app: SlackAppOptionDto): string {
  const updated =
    app.updated_by || app.updated_at
      ? `Updated${app.updated_by ? ` by ${app.updated_by}` : ""}${app.updated_at ? ` on ${format(new Date(app.updated_at), "MMM d, yyyy")}` : ""}`
      : "";

  return [
    app.client_id ? `Client ID ${app.client_id}` : "",
    app.client_secret_hint ? `Client secret ${app.client_secret_hint}` : "No client secret",
    app.signing_secret_hint ? `Signing secret ${app.signing_secret_hint}` : "No signing secret",
    updated,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** One selectable Slack app, with whether it is in use and its actions. */
const AppRow: React.FC<AppRowProps> = ({ app, admin, is_confirming_remove, onEdit, onAskRemove, onCancelRemove, onRemove }) => {
  const is_busy = admin.busy_key !== null;

  return (
    <li
      className={`rounded-lg border p-4 ${
        app.is_active ? "border-[var(--admin-button-primary)] bg-[var(--admin-button-primary)]/[0.05]" : "border-[var(--admin-list-border)] bg-shell-panel"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 ${
            app.is_active ? "border-[var(--admin-button-primary)]" : "border-shell-border-strong"
          }`}
        >
          {app.is_active ? <span className="h-2 w-2 rounded-full bg-[var(--admin-button-primary)]" /> : null}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-shell-text">{app.name}</span>
            {!app.is_editable ? (
              <span className="rounded-md bg-shell-hover px-2 py-0.5 text-[11px] font-bold text-shell-text-secondary">.env file</span>
            ) : null}
            {app.is_active ? <span className="admin-pill admin-pill-success">In use</span> : null}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            {app.is_configured ? (
              appDetails(app)
            ) : (
              <>
                Not set on the server. Add{" "}
                {ENVIRONMENT_VARIABLES.map((variable, index) => (
                  <React.Fragment key={variable}>
                    {index > 0 ? ", " : ""}
                    <code className="text-[12px]">{variable}</code>
                  </React.Fragment>
                ))}{" "}
                to the API .env file.
              </>
            )}
          </div>
        </div>

        {!is_confirming_remove ? (
          <div className="flex flex-none flex-wrap gap-2">
            {app.is_configured && !app.is_active ? (
              <button type="button" onClick={() => void admin.selectApp(app.key)} disabled={is_busy} className={PRIMARY_BUTTON}>
                {admin.busy_key === "select_app" ? "Switching…" : "Use this app"}
              </button>
            ) : null}
            {app.app_settings_url ? (
              <a href={app.app_settings_url} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
                Open in Slack
              </a>
            ) : null}
            {app.is_editable ? (
              <>
                <button type="button" onClick={onEdit} disabled={is_busy} className={SECONDARY_BUTTON}>
                  Edit
                </button>
                <button type="button" onClick={onAskRemove} disabled={is_busy} className={SECONDARY_BUTTON}>
                  Remove
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {is_confirming_remove ? (
        <div className="ml-7 mt-3 rounded-[9px] border border-[#e2445c]/25 bg-[#e2445c]/[0.06] p-3.5">
          <div className="text-[13px] font-bold text-shell-text">Remove {app.name}?</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            {app.is_active
              ? "It is in use, Slack switches back to the app in the API .env file. Workspaces added with it stay connected until you disconnect them."
              : "Workspaces added with it stay connected until you disconnect them."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onRemove}
              disabled={is_busy}
              className="rounded-[4px] bg-[#d83a52] px-4 py-[9px] text-[14px] font-medium text-white transition-colors hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
            >
              {admin.busy_key === "credentials" ? "Removing…" : "Remove"}
            </button>
            <button type="button" onClick={onCancelRemove} className={SECONDARY_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
};

/**
 * Administration > Integrations > Slack > Slack app, administrators and the account owner.
 *
 * Every Slack app the site can use, and which one is in use. The 97th Floor app is read from the
 * API .env file (SLACK_* variables) and cannot be changed here. Any number of other apps (for
 * example the Make It Simple app) can be added, edited and removed. Selecting an app also makes
 * the newest workspace added with it the active one.
 */
const SlackAppCredentialsCard: React.FC<SlackAppCredentialsCardProps> = ({ admin }) => {
  const credentials = admin.credentials;
  const [form_target, setFormTarget] = useState<FormTarget>(null);
  const [removing_id, setRemovingId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [client_id, setClientId] = useState("");
  const [client_secret, setClientSecret] = useState("");
  const [signing_secret, setSigningSecret] = useState("");
  const [redirect_uri, setRedirectUri] = useState("");
  const [configuration_token, setConfigurationToken] = useState("");
  const [is_manual, setIsManual] = useState(false);

  const editing_app = typeof form_target === "number" ? credentials?.apps.find((app) => app.id === form_target) ?? null : null;

  // Opens the form on its own while no app is set at all, there is nothing else to do on the page until then.
  useEffect(() => {
    if (credentials && !credentials.is_configured && credentials.apps.every((app) => !app.is_editable)) setFormTarget("new");
  }, [credentials]);

  // The form starts from the app being edited, or empty for a new one.
  useEffect(() => {
    setLabel(editing_app?.label ?? editing_app?.name ?? "");
    setClientId(editing_app?.client_id ?? "");
    setRedirectUri(editing_app?.redirect_uri_override ?? "");
    setClientSecret("");
    setSigningSecret("");
    setIsManual(false);
  }, [editing_app]);

  if (!credentials) return null;

  const is_saving = admin.busy_key === "credentials";
  const is_same_app = editing_app !== null && client_id.trim() === editing_app.client_id;
  const can_save = label.trim() !== "" && client_id.trim() !== "" && (is_same_app || client_secret.trim() !== "");
  const manifest_json = JSON.stringify(credentials.manifest, null, 2);

  const openForm = (target: FormTarget) => {
    setRemovingId(null);
    setFormTarget((current) => (current === target ? null : target));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const is_saved = await admin.saveCredentials(
      {
        label: label.trim(),
        client_id: client_id.trim(),
        client_secret: client_secret.trim() || null,
        signing_secret: signing_secret.trim() || null,
        redirect_uri: redirect_uri.trim() || null,
      },
      editing_app?.id ?? null
    );
    if (is_saved) setFormTarget(null);
  };

  const createApp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await admin.createApp(configuration_token.trim(), label.trim() || null)) {
      setConfigurationToken("");
      setFormTarget(null);
    }
  };

  const remove = async (app_id: number) => {
    if (await admin.removeCredentials(app_id)) {
      setRemovingId(null);
      if (form_target === app_id) setFormTarget(null);
    }
  };

  return (
    <section className={SECTION_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={SECTION_TITLE}>Slack app</h3>
          <p className={SECTION_HINT}>
            Choose the Slack app credentials the site uses. Notifications, automations and new workspaces go through the app in use.
          </p>
        </div>
        <button type="button" onClick={() => openForm("new")} aria-expanded={form_target === "new"} className={`${SECONDARY_BUTTON} flex-none`}>
          {form_target === "new" ? "Close" : "Add credentials"}
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {credentials.apps.map((app) => (
          <AppRow
            key={app.key}
            app={app}
            admin={admin}
            is_confirming_remove={app.id !== null && removing_id === app.id}
            onEdit={() => openForm(app.id)}
            onAskRemove={() => setRemovingId(app.id)}
            onCancelRemove={() => setRemovingId(null)}
            onRemove={() => app.id !== null && void remove(app.id)}
          />
        ))}
      </ul>

      {form_target !== null ? (
        <div className="mt-4 border-t border-shell-border pt-4">
          <div className="text-[14px] font-semibold text-shell-text">{editing_app ? `Edit ${editing_app.name}` : "Add Slack app credentials"}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
            {editing_app?.is_active
              ? "This app is in use, the changes apply right away."
              : "Saving does not change the app in use. Choose \"Use this app\" when you want to switch to it."}
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
                placeholder={is_same_app && editing_app?.client_secret_hint ? `Saved ${editing_app.client_secret_hint}, leave blank to keep` : "Client secret"}
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
                placeholder={is_same_app && editing_app?.signing_secret_hint ? `Saved ${editing_app.signing_secret_hint}, leave blank to keep` : "Signing secret"}
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
                {is_saving ? "Saving…" : "Save credentials"}
              </button>
              <button type="button" onClick={() => setFormTarget(null)} className={SECONDARY_BUTTON}>
                Cancel
              </button>
            </div>
          </form>

          {form_target === "new" ? (
            <>
              <button type="button" onClick={() => setIsManual((manual) => !manual)} aria-expanded={is_manual} className="mt-5 text-[12.5px] admin-link">
                {is_manual ? "Hide the other ways to create a Slack app" : "Do not have a Slack app yet? Create one"}
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
                      <li>2. Choose the workspace the app should belong to and click Generate.</li>
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
                        {is_saving ? "Creating…" : "Create Slack app"}
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] text-shell-text-faint">The name above is used for the new app.</p>
                    {!credentials.can_receive_events ? (
                      <p className="mt-2 text-[12px] text-shell-text-faint">
                        This API is not reachable from the internet, so the app is created without event subscriptions. Removing the app from a
                        workspace is then only noticed on the next message.
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
                      , choose &quot;From a manifest&quot;, pick a workspace and paste it. It already has the redirect URL, events URL and permissions.
                      Then paste the credentials in the form above.
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
            </>
          ) : null}
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
    </section>
  );
};

export default SlackAppCredentialsCard;
