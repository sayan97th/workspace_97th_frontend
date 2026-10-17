"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { useExternalAccounts } from "@/hooks/useExternalAccounts";
import { EXTERNAL_APPS, INTEGRATION_APPS_SETUP_PATH, PROVIDER_LABELS } from "@/lib/externalApps";
import { externalAccountService } from "@/services/external-account.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { ExternalService } from "@/types/external-account";
import { DANGER_BUTTON, MessageBanner, PRIMARY_BUTTON, SECONDARY_BUTTON, StatusPill } from "./integrationUi";

export type ExternalAccountsCardProps = {
  service: ExternalService;
  /** Where the provider sends the browser back to after the consent page. */
  return_path: string;
  /** Administrators can set up the Google or Microsoft app, everyone else is told to ask one. */
  can_manage_apps: boolean;
  /** Called after an account was connected or removed, so the sidebar badges refresh. */
  onChanged?: () => void;
  /** Opens the app's templates, the button is hidden when omitted. */
  onBrowseTemplates?: () => void;
};

/**
 * Integrations > Connections, one Gmail, Outlook or Google Calendar card: the signed in user's own
 * accounts for the service with how many automations use each, connect another and disconnect.
 */
export default function ExternalAccountsCard({ service, return_path, can_manage_apps, onChanged, onBrowseTemplates }: ExternalAccountsCardProps) {
  const accounts_api = useExternalAccounts(service);
  const [removing_id, setRemovingId] = useState<number | null>(null);
  const [is_removing, setIsRemoving] = useState(false);
  const [remove_error, setRemoveError] = useState<string | null>(null);
  const meta = EXTERNAL_APPS[service];
  const { accounts, is_configured, can_connect, is_loading } = accounts_api;

  // A finished "Connect" in the provider's tab refreshes the sidebar badges too.
  const { connected_id, consumeConnected } = accounts_api;
  useEffect(() => {
    if (connected_id === null) return;
    consumeConnected();
    onChanged?.();
  }, [connected_id, consumeConnected, onChanged]);

  const remove = async (account_id: number) => {
    setIsRemoving(true);
    setRemoveError(null);
    try {
      await externalAccountService.deleteAccount(account_id);
      setRemovingId(null);
      await accounts_api.reload();
      onChanged?.();
    } catch (failure) {
      setRemoveError(apiErrorMessage(failure, `The ${meta.label} account could not be disconnected.`));
    } finally {
      setIsRemoving(false);
    }
  };

  let status_pill: React.ReactNode = null;
  if (!is_loading) {
    if (accounts.length > 0) status_pill = <StatusPill label="Connected" is_positive />;
    else if (!is_configured) status_pill = <StatusPill label="Setup required" is_positive={false} />;
    else status_pill = <StatusPill label="Not connected" is_positive={false} />;
  }

  return (
    <section className="rounded-[10px] border border-boardtree-border-soft p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[9px] border border-boardtree-border-soft bg-boardtree-panel-alt">
          <ExternalAppLogo app={service} size={22} />
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-outfit text-section-title text-boardtree-text">{meta.label}</h3>
            {status_pill}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">
            {is_configured || is_loading
              ? `Connect your own ${PROVIDER_LABELS[meta.provider]} account, automations read and send through it on your behalf.`
              : can_manage_apps
                ? `Save the ${PROVIDER_LABELS[meta.provider]} app in Administration > Integrations so members can connect ${meta.label}.`
                : `An account administrator has to set up the ${PROVIDER_LABELS[meta.provider]} app first.`}
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          {!is_loading && !is_configured && can_manage_apps && (
            <Link href={INTEGRATION_APPS_SETUP_PATH} className={`${PRIMARY_BUTTON} inline-flex items-center`}>Set up {PROVIDER_LABELS[meta.provider]}</Link>
          )}
          {can_connect && (
            <button type="button" disabled={accounts_api.is_awaiting_provider} onClick={() => void accounts_api.connect(return_path)} className={accounts.length ? SECONDARY_BUTTON : PRIMARY_BUTTON}>
              {accounts_api.is_awaiting_provider ? `Waiting for ${PROVIDER_LABELS[meta.provider]}...` : accounts.length ? "Connect another" : `Connect ${meta.label}`}
            </button>
          )}
          {onBrowseTemplates && <button type="button" onClick={onBrowseTemplates} className={SECONDARY_BUTTON}>Templates</button>}
        </div>
      </div>

      <div className="mt-3">
        <MessageBanner error={remove_error ?? accounts_api.error} notice={accounts_api.notice} onDismiss={() => {
          setRemoveError(null);
          accounts_api.dismissMessages();
        }} />
      </div>

      {accounts.length > 0 && (
        <ul className="overflow-hidden rounded-[8px] border border-boardtree-border-soft">
          {accounts.map((account) => (
            <li key={account.id} className="border-b border-boardtree-border-soft px-3 py-2.5 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-boardtree-text">{account.email ?? account.name ?? meta.label}</div>
                  <div className="text-[12px] text-boardtree-text-faint">
                    {account.automations_count === 1 ? "Used by 1 automation" : `Used by ${account.automations_count} automations`}
                    {account.last_error ? <span className="text-boardtree-danger">. Connect it again: {account.last_error}</span> : null}
                  </div>
                </div>
                {removing_id !== account.id && (
                  <button type="button" onClick={() => setRemovingId(account.id)} className={SECONDARY_BUTTON}>Disconnect</button>
                )}
              </div>
              {removing_id === account.id && (
                <div className="mt-2 rounded-[6px] bg-boardtree-danger-hover px-3 py-2.5">
                  <p className="text-[12.5px] leading-relaxed text-boardtree-text-secondary">
                    {account.automations_count > 0 ? "Automations that use this account stop until you edit them and pick another one." : "No automation uses this account yet."}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={is_removing} onClick={() => void remove(account.id)} className={DANGER_BUTTON}>
                      {is_removing ? "Disconnecting..." : "Disconnect account"}
                    </button>
                    <button type="button" onClick={() => setRemovingId(null)} className={SECONDARY_BUTTON}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
