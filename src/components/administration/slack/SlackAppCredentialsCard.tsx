"use client";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackAppCredentialsDto } from "@/types/slack";
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

const SOURCE_LABELS: Record<SlackAppCredentialsDto["source"], string> = {
  database: "Saved in Administration",
  environment: "From the server environment",
  none: "Not set",
};

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

/**
 * Administration > Integrations > Slack app. Where an administrator points the integration at a
 * Slack app, without editing the API environment. Creating that app takes one paste thanks to
 * the manifest, and turning on public distribution lets the same app be installed into every
 * workspace the team uses. Secrets are write only, only their last four characters come back.
 */
const SlackAppCredentialsCard: React.FC<SlackAppCredentialsCardProps> = ({ admin }) => {
  const credentials = admin.credentials;
  const [is_open, setIsOpen] = useState(false);
  const [client_id, setClientId] = useState("");
  const [client_secret, setClientSecret] = useState("");
  const [signing_secret, setSigningSecret] = useState("");
  const [redirect_uri, setRedirectUri] = useState("");
  const [is_confirming_clear, setIsConfirmingClear] = useState(false);

  // Opens on its own while nothing is set, there is nothing else to do on the page until then.
  useEffect(() => {
    if (credentials && !credentials.is_configured) setIsOpen(true);
  }, [credentials]);

  useEffect(() => {
    if (!credentials) return;
    setClientId(credentials.source === "database" ? credentials.client_id ?? "" : "");
    setRedirectUri(credentials.redirect_uri_override ?? "");
    setClientSecret("");
    setSigningSecret("");
  }, [credentials]);

  if (!credentials) return null;

  const is_saved_app = credentials.source === "database" && client_id.trim() === credentials.client_id;
  const is_saving = admin.busy_key === "credentials";
  const can_save = client_id.trim() !== "" && (is_saved_app || client_secret.trim() !== "");
  const manifest_json = JSON.stringify(credentials.manifest, null, 2);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    await admin.saveCredentials({
      client_id: client_id.trim(),
      client_secret: client_secret.trim() || null,
      signing_secret: signing_secret.trim() || null,
      redirect_uri: redirect_uri.trim() || null,
    });
  };

  const clear = async () => {
    if (await admin.clearCredentials()) setIsConfirmingClear(false);
  };

  return (
    <section className={SECTION_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={SECTION_TITLE}>Slack app</h3>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                credentials.is_configured ? "bg-shell-hover text-shell-text-secondary" : "bg-[#e2445c]/[0.12] text-[#ff7a8a]"
              }`}
            >
              {SOURCE_LABELS[credentials.source]}
            </span>
          </div>
          <p className={SECTION_HINT}>
            {credentials.is_configured
              ? `Client ID ${credentials.client_id}${credentials.updated_by ? `, updated by ${credentials.updated_by}` : ""}${
                  credentials.updated_at ? ` on ${format(new Date(credentials.updated_at), "MMM d, yyyy")}` : ""
                }.`
              : "Connect a Slack app to this account before adding a workspace."}
          </p>
        </div>
        <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={is_open} className={`${SECONDARY_BUTTON} flex-none`}>
          {is_open ? "Close" : credentials.is_configured ? "Change app" : "Set up"}
        </button>
      </div>

      {is_open ? (
        <div className="mt-4 border-t border-shell-border pt-4">
          <ol className="flex flex-col gap-3 text-[12.5px] leading-relaxed text-shell-text-muted">
            <li>
              <span className="font-bold text-shell-text-secondary">1. Create the Slack app.</span> Open{" "}
              <a href="https://api.slack.com/apps?new_app=1" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-200 hover:underline">
                api.slack.com/apps
              </a>
              , choose &quot;From a manifest&quot;, pick any workspace you own and paste this manifest. It already has the redirect URL, events URL and permissions.
              <div className="mt-2 flex items-start gap-2">
                <pre className="max-h-[140px] min-w-0 flex-1 overflow-auto rounded-[8px] border border-shell-border bg-shell-panel px-3 py-2 text-[11.5px] text-shell-text-secondary">
                  {manifest_json}
                </pre>
                <CopyButton value={manifest_json} label="Copy manifest" />
              </div>
            </li>
            <li>
              <span className="font-bold text-shell-text-secondary">2. Allow it in every workspace.</span> In the Slack app, open Manage Distribution and
              activate public distribution. Without it the app can only be added to the workspace it was created in.
            </li>
            <li>
              <span className="font-bold text-shell-text-secondary">3. Paste the credentials below.</span> They are on the Basic Information page of the Slack
              app, under App Credentials.
            </li>
          </ol>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CopyField label="Redirect URL" value={credentials.redirect_uri} />
            <CopyField label="Events request URL" value={credentials.events_url} />
          </div>

          <form onSubmit={(event) => void save(event)} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                placeholder={is_saved_app && credentials.client_secret_hint ? `Saved ${credentials.client_secret_hint}, leave blank to keep` : "Client secret"}
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
                placeholder={is_saved_app && credentials.signing_secret_hint ? `Saved ${credentials.signing_secret_hint}, leave blank to keep` : "Signing secret"}
                autoComplete="new-password"
                className={TEXT_INPUT}
              />
            </label>
            <label className="block">
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
              Slack only accepts HTTPS redirect URLs for &quot;Connect my Slack&quot;. Use the override when the API is reached through a tunnel. Workspaces
              already connected keep working after you change the app, reconnect them to move them to the new one.
            </p>

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={!can_save || is_saving} className={PRIMARY_BUTTON}>
                {is_saving ? "Saving…" : "Save credentials"}
              </button>
              {credentials.source === "database" && !is_confirming_clear ? (
                <button type="button" onClick={() => setIsConfirmingClear(true)} disabled={is_saving} className={SECONDARY_BUTTON}>
                  Remove saved credentials
                </button>
              ) : null}
            </div>
          </form>

          {is_confirming_clear ? (
            <div className="mt-4 rounded-[9px] border border-[#e2445c]/25 bg-[#e2445c]/[0.06] p-3.5">
              <div className="text-[13px] font-bold text-shell-text">Remove the saved credentials?</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
                {credentials.has_environment_credentials
                  ? "The Slack app configured in the server environment will be used again."
                  : "No other Slack app is configured, so new workspaces cannot be connected until credentials are saved again."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void clear()}
                  disabled={is_saving}
                  className="rounded-[9px] bg-[#e2445c] px-4 py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
                >
                  {is_saving ? "Removing…" : "Remove"}
                </button>
                <button type="button" onClick={() => setIsConfirmingClear(false)} className={SECONDARY_BUTTON}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default SlackAppCredentialsCard;
