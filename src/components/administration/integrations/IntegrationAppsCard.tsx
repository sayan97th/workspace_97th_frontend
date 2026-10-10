"use client";
import React, { useState } from "react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_HINT, TEXT_INPUT } from "@/components/administration/slack/slackAdminStyles";
import { useIntegrationApps } from "@/hooks/useIntegrationApps";
import type { IntegrationAppDto, IntegrationAppPayload } from "@/types/external-account";

/** What each provider's console needs besides the redirect URL, shown under the form. */
const SETUP_STEPS: Record<IntegrationAppDto["provider"], string[]> = {
  google: [
    "Create an OAuth client of type \"Web application\" in Google Cloud > APIs and services > Credentials.",
    "Enable the Gmail API and the Google Calendar API for the project.",
    "Add the redirect URL shown above to \"Authorized redirect URIs\", then paste the client id and secret here.",
  ],
  microsoft: [
    "Register an application in Microsoft Entra ID > App registrations, for accounts in any organization and personal accounts.",
    "Add the redirect URL shown above as a \"Web\" redirect URI and create a client secret under Certificates and secrets.",
    "Paste the application (client) id and the secret value here. Leave the tenant empty unless only one organization may connect.",
  ],
};

function ProviderForm({ app, is_working, onSave, onRemove }: { app: IntegrationAppDto; is_working: boolean; onSave: (payload: IntegrationAppPayload) => Promise<boolean>; onRemove: () => void }) {
  const [client_id, setClientId] = useState(app.client_id ?? "");
  const [client_secret, setClientSecret] = useState("");
  const [tenant_id, setTenantId] = useState(app.tenant_id ?? "");
  const [redirect_uri, setRedirectUri] = useState(app.redirect_uri_override ?? "");
  const [is_copied, setIsCopied] = useState(false);
  const is_new_app = client_id.trim() !== (app.client_id ?? "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(app.redirect_uri);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await onSave({ client_id: client_id.trim(), client_secret: client_secret.trim() || null, tenant_id: tenant_id.trim() || null, redirect_uri: redirect_uri.trim() || null });
        if (saved) setClientSecret("");
      }}
      className="mt-4 grid gap-3"
    >
      <label>
        <span className={FIELD_LABEL}>Client id</span>
        <input value={client_id} onChange={(event) => setClientId(event.target.value)} required maxLength={255} autoComplete="off" className={TEXT_INPUT} />
      </label>
      <label>
        <span className={FIELD_LABEL}>Client secret</span>
        <input
          type="password"
          value={client_secret}
          onChange={(event) => setClientSecret(event.target.value)}
          maxLength={500}
          autoComplete="new-password"
          placeholder={app.client_secret_hint && !is_new_app ? `Saved (${app.client_secret_hint}), leave empty to keep it` : "Paste the client secret"}
          required={!app.client_secret_hint || is_new_app}
          className={TEXT_INPUT}
        />
      </label>
      {app.provider === "microsoft" && (
        <label>
          <span className={FIELD_LABEL}>Tenant (optional)</span>
          <input value={tenant_id} onChange={(event) => setTenantId(event.target.value)} maxLength={100} placeholder="common" className={TEXT_INPUT} />
        </label>
      )}
      <div>
        <span className={FIELD_LABEL}>Redirect URL to register</span>
        <div className="mt-1.5 flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[9px] border border-shell-border bg-shell-panel px-3 py-[9px] text-[12.5px] text-shell-text-secondary">{app.redirect_uri}</code>
          <button type="button" onClick={() => void copy()} className={SECONDARY_BUTTON}>{is_copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
      <details>
        <summary className="cursor-pointer text-[12.5px] text-shell-text-muted">Advanced</summary>
        <label className="mt-2 block">
          <span className={FIELD_LABEL}>Redirect URL override</span>
          <input value={redirect_uri} onChange={(event) => setRedirectUri(event.target.value)} type="url" maxLength={255} placeholder={app.default_redirect_uri} className={TEXT_INPUT} />
          <span className={SECTION_HINT}>Only needed behind an HTTPS tunnel. It must end with /api/integrations/accounts/callback.</span>
        </label>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={is_working || client_id.trim() === ""} className={PRIMARY_BUTTON}>{is_working ? "Saving..." : "Save"}</button>
        {app.is_configured && (
          <button type="button" disabled={is_working} onClick={onRemove} className={SECONDARY_BUTTON}>Remove app</button>
        )}
        <a href={app.console_url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-brand-200 hover:underline">
          Open the {app.label} console
        </a>
      </div>
      <ol className="mt-1 list-decimal pl-5 text-[12.5px] leading-relaxed text-shell-text-muted">
        {SETUP_STEPS[app.provider].map((step) => <li key={step}>{step}</li>)}
      </ol>
    </form>
  );
}

/**
 * Administration > Integrations, the Google and Microsoft apps behind the Gmail, Google Calendar
 * and Outlook recipes of the Automations center. An administrator saves each app once, then every
 * member connects their own account from a recipe.
 */
export default function IntegrationAppsCard() {
  const apps_api = useIntegrationApps(true);
  const [open_provider, setOpenProvider] = useState<IntegrationAppDto["provider"] | null>(null);
  const message = apps_api.error ?? apps_api.notice;

  return (
    <div className="mt-6">
      <div className="mb-2.5 text-[13px] font-bold text-shell-text-secondary">Gmail, Google Calendar and Outlook</div>
      {message && (
        <div role={apps_api.error ? "alert" : "status"} className={`mb-3 flex items-start justify-between gap-3 rounded-[9px] px-3 py-2 text-[12.5px] ${apps_api.error ? "bg-[#e2445c]/[0.12] text-[#ff8a9b]" : "bg-[#00c875]/[0.12] text-[#3ddc97]"}`}>
          <span>{message}</span>
          <button type="button" onClick={apps_api.dismissMessages} className="flex-none font-semibold opacity-80 hover:opacity-100">Dismiss</button>
        </div>
      )}
      {apps_api.is_loading ? (
        <div className="text-[13px] text-shell-text-faint">Loading apps…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {apps_api.apps.map((app) => {
            const is_open = open_provider === app.provider;
            return (
              <div key={app.provider} className="rounded-xl border border-shell-border bg-shell-panel-alt p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-11 flex-none items-center gap-1.5 rounded-[10px] border border-shell-border bg-shell-panel px-2.5">
                    {app.services.map((service) => <ExternalAppLogo key={service.id} app={service.id} size={22} />)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[15px] font-bold text-shell-text">{app.services.map((service) => service.label).join(" and ")}</div>
                      {app.is_configured ? (
                        <span className="rounded-md bg-[#00c875]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#3ddc97]">Ready</span>
                      ) : (
                        <span className="rounded-md bg-[#fdab3d]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#fdab3d]">Setup required</span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-shell-text-muted">
                      {app.is_configured
                        ? `Members connect their own ${app.label} account from the Automations center.${app.updated_by ? ` Saved by ${app.updated_by}.` : ""}`
                        : `Save a ${app.label} OAuth app so members can use the ${app.services.map((service) => service.label).join(" and ")} recipes.`}
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpenProvider(is_open ? null : app.provider)} aria-expanded={is_open} className={`${app.is_configured ? SECONDARY_BUTTON : PRIMARY_BUTTON} flex-none`}>
                    {is_open ? "Close" : app.is_configured ? `Manage ${app.label}` : `Set up ${app.label}`}
                  </button>
                </div>
                {is_open && (
                  <ProviderForm
                    key={`${app.provider}_${app.updated_at ?? "new"}`}
                    app={app}
                    is_working={apps_api.working_provider === app.provider}
                    onSave={(payload) => apps_api.save(app.provider, payload)}
                    onRemove={() => void apps_api.remove(app.provider)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
