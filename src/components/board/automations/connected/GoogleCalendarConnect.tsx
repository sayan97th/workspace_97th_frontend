"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import GoogleGlyph from "@/components/integrations/GoogleGlyph";
import { useAuth } from "@/context/AuthContext";
import { useAccountBranding } from "@/hooks/useAccountBranding";
import { INTEGRATION_APPS_SETUP_PATH } from "@/lib/externalApps";
import type { ConnectedAccountStepProps } from "./ConnectedAccountStep";
import "./google-calendar-connect.scss";

/** The sample events the illustration drops into the week, by day index (0 = Monday). */
const PREVIEW_EVENTS: { day: number; title: string; time: string; tone: "blue" | "green" | "orange" }[] = [
  { day: 1, title: "Kickoff", time: "9 AM", tone: "blue" },
  { day: 3, title: "Review", time: "2 PM", tone: "green" },
  { day: 4, title: "Launch", time: "All day", tone: "orange" },
];

const BENEFITS: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: "One click, no setup",
    text: "Sign in with your Google account. No keys, no Google Cloud project.",
    icon: <path d="M13 3 L5 13 H11 L10 21 L19 10 H13 Z" />,
  },
  {
    title: "Always in sync",
    text: "Each item with a date becomes an event, and moves when the date changes.",
    icon: <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5" />,
  },
  {
    title: "Private to you",
    text: "Only calendars and events are shared. Disconnect any time.",
    icon: <path d="M12 3 L19 6 V11 C19 15.5 16 19 12 21 C8 19 5 15.5 5 11 V6 Z M9 12 L11 14 L15 10" />,
  },
];

/** Monday to Friday of the current week, so the preview always looks like "this week". */
function useCurrentWeek(): { month_label: string; days: { key: string; weekday: string; date: number; is_today: boolean }[] } {
  return useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const days = Array.from({ length: 5 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return {
        key: day.toISOString().slice(0, 10),
        weekday: day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        date: day.getDate(),
        is_today: day.toDateString() === today.toDateString(),
      };
    });

    return { month_label: today.toLocaleDateString("en-US", { month: "long", year: "numeric" }), days };
  }, []);
}

/** The workspace and Google Calendar linked by a turning sync ring, over a week with events landing in it. */
function SyncPreview() {
  const { logo_url } = useAccountBranding();
  const { month_label, days } = useCurrentWeek();

  return (
    <div className="gcal-connect__preview" aria-hidden="true">
      <div className="gcal-connect__link">
        <span className="gcal-connect__badge">
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo_url} alt="" />
          ) : (
            <span className="gcal-connect__badge-fallback">97</span>
          )}
        </span>
        <span className="gcal-connect__wire">
          <span className="gcal-connect__pulse" />
        </span>
        <span className="gcal-connect__sync">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5" />
          </svg>
        </span>
        <span className="gcal-connect__wire gcal-connect__wire--reverse">
          <span className="gcal-connect__pulse" />
        </span>
        <span className="gcal-connect__badge">
          <ExternalAppLogo app="google_calendar" size={30} />
        </span>
      </div>

      <div className="gcal-connect__calendar">
        <div className="gcal-connect__calendar-head">
          <ExternalAppLogo app="google_calendar" size={18} />
          <span>{month_label}</span>
        </div>
        <div className="gcal-connect__week">
          {days.map((day, index) => (
            <div key={day.key} className="gcal-connect__day">
              <span className="gcal-connect__weekday">{day.weekday}</span>
              <span className={`gcal-connect__date${day.is_today ? " gcal-connect__date--today" : ""}`}>{day.date}</span>
              <div className="gcal-connect__slot">
                {PREVIEW_EVENTS.filter((event) => event.day === index).map((event, order) => (
                  <span key={event.title} className={`gcal-connect__event gcal-connect__event--${event.tone}`} style={{ animationDelay: `${0.5 + (event.day + order) * 0.25}s` }}>
                    <span className="gcal-connect__event-title">{event.title}</span>
                    <span className="gcal-connect__event-time">{event.time}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="gcal-connect__spinner" aria-hidden="true" />;
}

/** First letter of the account, for the round avatar in the account list. */
const accountInitial = (label: string): string => label.trim().charAt(0).toUpperCase() || "G";

/**
 * The Google Calendar half of the connect and fill flow, a friendlier take on monday.com's
 * "Connect your account" screen. Members sign in with Google in a new tab, the address they use
 * in the app is suggested, and nothing has to be set up first: the API falls back to the
 * "Sign in with Google" app when an administrator did not save a custom one.
 */
export default function GoogleCalendarConnect({ accounts_api, selected_id, onSelect, onContinue, can_manage, return_path }: ConnectedAccountStepProps) {
  const { user } = useAuth();
  const { accounts, is_configured, can_connect, is_loading, is_awaiting_provider } = accounts_api;
  const message = accounts_api.error ?? accounts_api.notice;
  const signed_in_email = user?.email ?? null;

  const connect = () => void accounts_api.connect(return_path);

  const waiting = (
    <div className="gcal-connect__waiting" role="status">
      <Spinner />
      <div className="gcal-connect__waiting-text">
        <strong>Waiting for Google...</strong>
        <span>Finish signing in on the Google tab, this screen updates by itself.</span>
      </div>
      <button type="button" className="gcal-connect__link-button" onClick={accounts_api.cancelAwaitingProvider}>Cancel</button>
    </div>
  );

  let body: React.ReactNode;

  if (is_loading) {
    body = (
      <div className="gcal-connect__skeleton" aria-label="Loading your Google accounts" role="status">
        <span />
        <span />
        <span />
      </div>
    );
  } else if (!is_configured) {
    body = (
      <>
        <span className="gcal-connect__eyebrow gcal-connect__eyebrow--warning">Setup needed</span>
        <h2 className="gcal-connect__title">Google Calendar is not available yet</h2>
        <p className="gcal-connect__lead">
          {can_manage
            ? "Google sign in is not set up for this account. Add a Google app once in Administration, then everyone can connect in one click."
            : "Google sign in is not set up for this account yet. Ask an account administrator to turn it on."}
        </p>
        {can_manage && (
          <Link href={INTEGRATION_APPS_SETUP_PATH} className="gcal-connect__primary">Open Administration</Link>
        )}
      </>
    );
  } else if (accounts.length === 0) {
    body = (
      <>
        <span className="gcal-connect__eyebrow">Google Calendar</span>
        <h2 className="gcal-connect__title">Bring your board dates to your calendar</h2>
        <p className="gcal-connect__lead">Connect your Google account and every dated item shows up as an event you can see next to your meetings.</p>

        <ul className="gcal-connect__benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <span className="gcal-connect__benefit-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{benefit.icon}</svg>
              </span>
              <span>
                <strong>{benefit.title}</strong>
                <span>{benefit.text}</span>
              </span>
            </li>
          ))}
        </ul>

        {!can_connect ? (
          <p className="gcal-connect__muted">You do not have permission to connect integrations. Ask an account administrator.</p>
        ) : is_awaiting_provider ? (
          waiting
        ) : (
          <>
            <button type="button" onClick={connect} className="gcal-connect__google">
              <GoogleGlyph size={20} />
              Continue with Google
            </button>
            <p className="gcal-connect__hint">
              {signed_in_email ? (
                <>Google opens in a new tab and suggests <strong>{signed_in_email}</strong>. You can pick another account there.</>
              ) : (
                "Google opens in a new tab so you can pick your account."
              )}
            </p>
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <span className="gcal-connect__eyebrow gcal-connect__eyebrow--success">Connected</span>
        <h2 className="gcal-connect__title">Choose a Google account</h2>
        <p className="gcal-connect__lead">Events from this automation are added to the calendar of the account you choose.</p>

        <div role="radiogroup" aria-label="Google Calendar accounts" className="gcal-connect__accounts">
          {accounts.map((account) => {
            const is_selected = account.id === selected_id;
            const label = account.email ?? account.name ?? "Google account";
            const usage = account.automations_count > 0 ? `Used by ${account.automations_count} ${account.automations_count === 1 ? "automation" : "automations"}` : null;
            return (
              <button
                key={account.id}
                type="button"
                role="radio"
                aria-checked={is_selected}
                onClick={() => onSelect(account.id)}
                className={`gcal-connect__account${is_selected ? " gcal-connect__account--selected" : ""}`}
              >
                <span className="gcal-connect__avatar">{accountInitial(label)}</span>
                <span className="gcal-connect__account-text">
                  <strong>{label}</strong>
                  <span>
                    {account.last_error ? <em className="gcal-connect__account-error">Needs to be connected again</em> : account.name ?? "Connected"}
                    {usage ? `, ${usage.toLowerCase()}` : ""}
                  </span>
                </span>
                <span className="gcal-connect__check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" /></svg>
                </span>
              </button>
            );
          })}
        </div>

        <div className="gcal-connect__actions">
          <button type="button" disabled={selected_id === null} onClick={onContinue} className="gcal-connect__primary">Continue</button>
          {can_connect && !is_awaiting_provider && (
            <button type="button" onClick={connect} className="gcal-connect__link-button">
              <GoogleGlyph size={14} />
              Use another Google account
            </button>
          )}
        </div>
        {is_awaiting_provider && waiting}
      </>
    );
  }

  return (
    <div className="gcal-connect">
      <SyncPreview />

      <section className="gcal-connect__card" aria-live="polite">
        {body}

        {message && (
          <div role={accounts_api.error ? "alert" : "status"} className={`gcal-connect__message${accounts_api.error ? " gcal-connect__message--error" : ""}`}>
            <span>{message}</span>
            <button type="button" onClick={accounts_api.dismissMessages}>Dismiss</button>
          </div>
        )}

        <p className="gcal-connect__privacy">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 11 V8 a5 5 0 0 1 10 0 V11 M6 11 H18 V20 H6 Z" /></svg>
          Google only shares your calendar list and lets this board add and update its events.
        </p>
      </section>
    </div>
  );
}
