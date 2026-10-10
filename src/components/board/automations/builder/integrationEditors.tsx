"use client";
import React, { useState } from "react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { useExternalAccounts, type ExternalAccountsApi } from "@/hooks/useExternalAccounts";
import { useGoogleCalendars } from "@/hooks/useGoogleCalendars";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import type { ExternalAccountDto, ExternalService } from "@/types/external-account";
import { PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, POPOVER_SECONDARY } from "./builderUi";

/** What picking an account hands back, the email is kept on the automation so the sentence can name it. */
export type PickedAccount = { id: number; email: string | null; service: ExternalService };

const FILTER_MAX_LENGTH = 200;

/** One service's accounts, with a Connect link while the provider tab is not open. */
function AccountSection({ api, selected_id, onPick }: { api: ExternalAccountsApi; selected_id: number | null; onPick: (account: PickedAccount) => void }) {
  const app = EXTERNAL_APPS[api.service];

  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-2 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
        <ExternalAppLogo app={api.service} size={13} />
        {app.label}
      </div>
      {api.is_loading ? (
        <div className="px-2 py-1.5 text-[12.5px] text-boardtree-text-faint">Loading accounts...</div>
      ) : (
        api.accounts.map((account: ExternalAccountDto) => (
          <button
            key={account.id}
            type="button"
            role="option"
            aria-selected={account.id === selected_id}
            onClick={() => onPick({ id: account.id, email: account.email, service: api.service })}
            className={`flex w-full items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-boardtree-hover ${account.id === selected_id ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text"}`}
          >
            <span className="truncate">{account.email ?? account.name ?? `${app.label} account`}</span>
            {account.last_error && <span className="flex-none text-[11px] text-boardtree-danger">Reconnect</span>}
          </button>
        ))
      )}
      {!api.is_loading && !api.is_configured && <div className="px-2 py-1.5 text-[12px] text-boardtree-text-faint">{app.label} is not set up yet. An administrator sets it up in Administration &gt; Integrations.</div>}
      {!api.is_loading && api.is_configured && api.can_connect && (
        api.is_awaiting_provider ? (
          <div className="px-2 py-1.5 text-[12px] text-boardtree-text-faint">
            Waiting for {app.label}...{" "}
            <button type="button" onClick={api.cancelAwaitingProvider} className="text-boardtree-accent hover:underline">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => void api.connect()} className="w-full rounded-[6px] px-2 py-1.5 text-left text-[12.5px] font-medium text-boardtree-accent hover:bg-boardtree-hover">
            {api.accounts.length ? `Connect another ${app.label} account` : `Connect a ${app.label} account`}
          </button>
        )
      )}
      {api.error && <div className="px-2 py-1 text-[12px] text-boardtree-danger">{api.error}</div>}
    </div>
  );
}

/** The Gmail and Outlook accounts an "email is received" trigger or "send an email" action can use. */
export function MailAccountPicker({ selected_id, onPick, with_app_mailer = false }: { selected_id: number | null; onPick: (account: PickedAccount | null) => void; with_app_mailer?: boolean }) {
  const gmail = useExternalAccounts("gmail");
  const outlook = useExternalAccounts("outlook");

  return (
    <div role="listbox" aria-label="Email account" className="max-h-[320px] overflow-y-auto">
      {with_app_mailer && (
        <button
          type="button"
          role="option"
          aria-selected={selected_id === null}
          onClick={() => onPick(null)}
          className={`mb-1 w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-boardtree-hover ${selected_id === null ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text"}`}
        >
          The app&apos;s email address
        </button>
      )}
      <AccountSection api={gmail} selected_id={selected_id} onPick={onPick} />
      <AccountSection api={outlook} selected_id={selected_id} onPick={onPick} />
    </div>
  );
}

/** The Google Calendar accounts a calendar action can use. */
export function CalendarAccountPicker({ selected_id, onPick }: { selected_id: number | null; onPick: (account: PickedAccount) => void }) {
  const accounts = useExternalAccounts("google_calendar");
  return (
    <div role="listbox" aria-label="Google account" className="max-h-[320px] overflow-y-auto">
      <AccountSection api={accounts} selected_id={selected_id} onPick={onPick} />
    </div>
  );
}

/** The calendars of one Google account, the primary one first. */
export function CalendarPicker({ account_id, selected, onPick }: { account_id: number | null; selected: string | null; onPick: (calendar: { id: string; name: string }) => void }) {
  const calendars = useGoogleCalendars(account_id);

  if (account_id === null) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Choose the Google account first.</div>;

  return (
    <div>
      {calendars.error && <div className="mb-1.5 rounded-[6px] bg-boardtree-danger-hover px-2 py-1.5 text-[12px] text-boardtree-danger">{calendars.error}</div>}
      {calendars.is_loading ? (
        <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading calendars...</div>
      ) : (
        <PickerList
          sections={[{ entries: calendars.calendars.map((calendar) => ({ id: calendar.id, label: calendar.name, hint: calendar.is_primary ? "Primary" : undefined })) }]}
          selected={selected}
          placeholder="Search calendars"
          empty_text={calendars.calendars.length === 0 ? "No calendar you can add events to." : "No calendar matches your search."}
          onPick={(id) => {
            const calendar = calendars.calendars.find((entry) => entry.id === id);
            if (calendar) onPick({ id: calendar.id, name: calendar.name });
          }}
          max_height={220}
        />
      )}
      <button type="button" disabled={calendars.is_refreshing} onClick={() => void calendars.refresh()} className="mt-1.5 block w-full rounded-[6px] py-1 text-[12px] text-boardtree-text-muted hover:bg-boardtree-hover disabled:opacity-50">
        {calendars.is_refreshing ? "Refreshing..." : "Refresh calendars"}
      </button>
    </div>
  );
}

/** Which emails count: an optional sender and subject text, matched without case. */
export function EmailFilterEditor({ from_filter, subject_filter, onApply }: { from_filter: string; subject_filter: string; onApply: (from_filter: string | null, subject_filter: string | null) => void }) {
  const [from, setFrom] = useState(from_filter);
  const [subject, setSubject] = useState(subject_filter);
  const apply = () => onApply(from.trim() || null, subject.trim() || null);

  return (
    <>
      <div className={POPOVER_LABEL}>From contains</div>
      <input autoFocus value={from} maxLength={FILTER_MAX_LENGTH} placeholder="Any sender" aria-label="From contains" onChange={(event) => setFrom(event.target.value)} className={POPOVER_INPUT} />
      <div className={`${POPOVER_LABEL} mt-3`}>Subject contains</div>
      <input
        value={subject}
        maxLength={FILTER_MAX_LENGTH}
        placeholder="Any subject"
        aria-label="Subject contains"
        onChange={(event) => setSubject(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") apply();
        }}
        className={POPOVER_INPUT}
      />
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Leave both empty to create an item for every new email in the inbox.</div>
      <PopoverFooter onDone={apply} extra={from_filter || subject_filter ? <button type="button" onClick={() => onApply(null, null)} className={POPOVER_SECONDARY}>Every email</button> : undefined} />
    </>
  );
}

/** The words a sentence shows for the email filters, after "email". */
export function emailFilterLabel(from_filter: string | null | undefined, subject_filter: string | null | undefined): string {
  if (from_filter && subject_filter) return `from "${from_filter}" about "${subject_filter}"`;
  if (from_filter) return `from "${from_filter}"`;
  if (subject_filter) return `about "${subject_filter}"`;
  return "of any kind";
}
