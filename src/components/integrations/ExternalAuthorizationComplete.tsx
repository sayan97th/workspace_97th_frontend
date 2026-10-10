"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import { announceExternalAuthorization, externalAuthorizationErrorMessage } from "@/lib/externalAccountAuthorizationTab";
import type { ExternalAuthorizationMessage, ExternalService } from "@/types/external-account";

/** Short pause so the person sees the result before the tab closes. */
const CLOSE_DELAY_MS = 1200;

const readService = (value: string | null): ExternalService | null => (value === "gmail" || value === "outlook" || value === "google_calendar" ? value : null);

const readNumber = (value: string | null): number | null => (value !== null && /^\d+$/.test(value) ? Number(value) : null);

/**
 * The last step of a Gmail, Outlook or Google Calendar connection opened in a new tab: tells the
 * tab that started it how it went, then closes itself, like the Slack completion page. When the
 * browser does not allow closing it, it stays open with the result and a way back.
 */
const ExternalAuthorizationComplete: React.FC = () => {
  const search_params = useSearchParams();
  const [could_not_close, setCouldNotClose] = useState(false);

  const message = useMemo<ExternalAuthorizationMessage>(
    () => ({
      type: "external_account_authorization_complete",
      result: search_params.get("result") === "connected" ? "connected" : "error",
      service: readService(search_params.get("service")),
      reason: search_params.get("reason"),
      account_id: readNumber(search_params.get("account_id")),
      email: search_params.get("email"),
    }),
    [search_params]
  );

  useEffect(() => {
    announceExternalAuthorization(message);

    const timer = window.setTimeout(() => {
      window.close();
      // `window.close()` silently does nothing for a tab the script did not open.
      window.setTimeout(() => setCouldNotClose(true), 300);
    }, CLOSE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [message]);

  const app = message.service ? EXTERNAL_APPS[message.service] : null;
  const app_label = app?.label ?? "Your account";
  const is_connected = message.result === "connected";
  const title = is_connected ? `${app_label} is connected` : `${app_label} was not connected`;
  const detail = is_connected
    ? `${message.email ? `${message.email} is ready. ` : ""}Go back to the workspace tab to finish your automation.`
    : externalAuthorizationErrorMessage(message.reason, app?.label);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-xl border border-shell-border bg-shell-panel-alt p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border border-shell-border bg-shell-panel">
          {message.service ? <ExternalAppLogo app={message.service} size={26} /> : null}
        </div>
        <h1 className={`mt-4 text-[17px] font-bold ${is_connected ? "text-shell-text" : "text-brand-200"}`}>{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-shell-text-muted">{detail}</p>

        {could_not_close ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Link href="/automations" className="rounded-[9px] bg-brand-500 px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-brand-600">
              Back to the workspace
            </Link>
            <span className="text-[12px] text-shell-text-faint">If the workspace is open in another tab, it was already updated. You can close this tab.</span>
          </div>
        ) : (
          <p className="mt-5 text-[12px] text-shell-text-faint">This tab closes on its own.</p>
        )}
      </div>
    </main>
  );
};

export default ExternalAuthorizationComplete;
