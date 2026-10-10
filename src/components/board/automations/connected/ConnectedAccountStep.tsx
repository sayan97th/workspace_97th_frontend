"use client";
import React from "react";
import Link from "next/link";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { useAccountBranding } from "@/hooks/useAccountBranding";
import type { ExternalAccountsApi } from "@/hooks/useExternalAccounts";
import { EXTERNAL_APPS, INTEGRATION_APPS_SETUP_PATH, PROVIDER_LABELS } from "@/lib/externalApps";

export type ConnectedAccountStepProps = {
  accounts_api: ExternalAccountsApi;
  selected_id: number | null;
  onSelect: (account_id: number) => void;
  onContinue: () => void;
  /** Administrators get a link to Administration > Integrations while the provider app is not set up. */
  can_manage: boolean;
  /** Where the provider sends the browser back to when the new tab was blocked. */
  return_path: string;
};

const WHITE_BUTTON = "h-10 rounded-[4px] bg-white px-8 text-[14px] text-[#323338] hover:bg-white/90 disabled:opacity-60";
const LINK_BUTTON = "text-[13px] font-medium text-white underline-offset-2 hover:underline disabled:opacity-60";

/** A white hexagon holding a logo, the two ends of monday's connection illustration. */
function Hexagon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[64px] w-[58px] items-center justify-center">
      <svg viewBox="0 0 58 64" className="absolute inset-0 h-full w-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]" aria-hidden="true">
        <path d="M29 2 L55 17 L55 47 L29 62 L3 47 L3 17 Z" fill="white" stroke="white" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span className="relative">{children}</span>
    </div>
  );
}

/** The workspace and app hexagons inside two orbits, like monday's "Connect your account" screen. */
function ConnectionIllustration({ accounts_api }: { accounts_api: ExternalAccountsApi }) {
  const { logo_url } = useAccountBranding();

  return (
    <div className="relative flex h-[256px] w-[256px] flex-none items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 256 256" className="absolute inset-0 h-full w-full">
        <circle cx="128" cy="128" r="126" fill="none" stroke="white" strokeOpacity="0.12" />
        <circle cx="128" cy="128" r="106" fill="none" stroke="white" strokeOpacity="0.55" />
        <circle cx="128" cy="128" r="70" fill="none" stroke="white" strokeOpacity="0.85" />
        {[[70, 14], [186, 38], [134, 54], [239, 186], [72, 218]].map(([cx, cy]) => (
          <circle key={`${cx}_${cy}`} cx={cx} cy={cy} r="3.5" fill="white" />
        ))}
      </svg>
      <div className="relative flex items-center gap-6">
        <Hexagon>
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo_url} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-brand-500 text-[12px] font-bold text-white">97</span>
          )}
        </Hexagon>
        <svg viewBox="0 0 34 14" width="34" height="14" className="text-white">
          <path d="M6 2 L1 7 L6 12 M1 7 H14 M28 2 L33 7 L28 12 M33 7 H20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Hexagon>
          <ExternalAppLogo app={accounts_api.service} size={28} />
        </Hexagon>
      </div>
    </div>
  );
}

/**
 * The account half of a Gmail, Outlook or Google Calendar recipe, the same screen as Slack's.
 * Without an account it is "Connect your Gmail account", Connect opens the provider's consent page
 * in a new tab. With accounts it lets the member pick the one this automation uses.
 */
export default function ConnectedAccountStep({ accounts_api, selected_id, onSelect, onContinue, can_manage, return_path }: ConnectedAccountStepProps) {
  const { accounts, is_configured, can_connect, is_loading, is_awaiting_provider, service } = accounts_api;
  const app = EXTERNAL_APPS[service];
  const provider_label = PROVIDER_LABELS[app.provider];

  const connect_button = is_awaiting_provider ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-10 items-center gap-2 rounded-[4px] bg-white/15 px-4 text-[14px]">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        Waiting for {app.label}...
      </span>
      <button type="button" onClick={accounts_api.cancelAwaitingProvider} className={LINK_BUTTON}>Cancel</button>
    </div>
  ) : (
    <button type="button" onClick={() => void accounts_api.connect(return_path)} className={WHITE_BUTTON}>Connect</button>
  );

  let body: React.ReactNode;

  if (is_loading) {
    body = <p className="text-[15px] text-white/80">Loading your {app.label} accounts...</p>;
  } else if (!is_configured) {
    body = (
      <>
        <h2 className="text-[22px] font-normal">{app.label} is not set up yet</h2>
        <p className="mt-2 max-w-[440px] text-[14.5px] leading-relaxed text-white/85">
          {can_manage
            ? `The ${provider_label} app needs a one time setup before anyone can connect ${app.label}.`
            : `Ask an account administrator to set up ${provider_label} in Administration > Integrations.`}
        </p>
        {can_manage && <Link href={INTEGRATION_APPS_SETUP_PATH} className={`${WHITE_BUTTON} mt-6 inline-flex items-center`}>Set up {provider_label}</Link>}
      </>
    );
  } else if (accounts.length === 0) {
    body = (
      <>
        <h2 className="text-[22px] font-normal">Connect your {app.label} account</h2>
        <p className="mt-2 max-w-[440px] text-[14.5px] leading-relaxed text-white/85">
          Clicking on &apos;Connect&apos; will open the {provider_label} sign in page in a new tab in order to create this integration.
        </p>
        <div className="mt-6">
          {can_connect ? connect_button : <p className="text-[13.5px] text-white/85">You do not have permission to connect integrations. Ask an account administrator.</p>}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h2 className="text-[22px] font-normal">Choose your {app.label} account</h2>
        <p className="mt-2 max-w-[440px] text-[14.5px] leading-relaxed text-white/85">This automation uses the account you choose.</p>
        <div role="radiogroup" aria-label={`${app.label} accounts`} className="mt-5 flex max-h-[240px] max-w-[440px] flex-col gap-2 overflow-y-auto">
          {accounts.map((account) => {
            const is_selected = account.id === selected_id;
            return (
              <button
                key={account.id}
                type="button"
                role="radio"
                aria-checked={is_selected}
                onClick={() => onSelect(account.id)}
                className={`flex items-center gap-3 rounded-[6px] border px-3.5 py-2.5 text-left transition-colors ${is_selected ? "border-white bg-white/20" : "border-white/25 hover:bg-white/10"}`}
              >
                <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 ${is_selected ? "border-white" : "border-white/60"}`}>
                  {is_selected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[6px] bg-white"><ExternalAppLogo app={service} size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">{account.email ?? account.name ?? `${app.label} account`}</span>
                  <span className="block truncate text-[12.5px] text-white/75">
                    {account.last_error ? "Needs to be connected again" : account.name ? `Connected as ${account.name}` : "Connected"}
                    {account.automations_count > 0 ? `, used by ${account.automations_count} ${account.automations_count === 1 ? "automation" : "automations"}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <button type="button" disabled={selected_id === null} onClick={onContinue} className={WHITE_BUTTON}>Continue</button>
          {can_connect && !is_awaiting_provider && (
            <button type="button" onClick={() => void accounts_api.connect(return_path)} className={LINK_BUTTON}>Connect another account</button>
          )}
          {is_awaiting_provider && connect_button}
        </div>
      </>
    );
  }

  const message = accounts_api.error ?? accounts_api.notice;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-10 md:flex-row">
      <ConnectionIllustration accounts_api={accounts_api} />
      <div className="w-full max-w-[460px]">
        {body}
        {message && (
          <div role={accounts_api.error ? "alert" : "status"} className={`mt-4 flex items-start justify-between gap-3 rounded-[6px] px-3 py-2 text-[13px] ${accounts_api.error ? "bg-[#ffebeb] text-[#9d1c1c]" : "bg-white/15 text-white"}`}>
            <span>{message}</span>
            <button type="button" onClick={accounts_api.dismissMessages} className="flex-none text-[12px] font-medium opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}
