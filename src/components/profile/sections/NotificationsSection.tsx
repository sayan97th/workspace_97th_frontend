"use client";
import React from "react";
import { SettingsToggleRow } from "@/components/administration";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import type { EmailDigestFrequency } from "@/types/auth";
import ProfileCheckbox from "../ProfileCheckbox";
import type { ProfileManagerApi } from "../useProfileManager";

export type NotificationsSectionProps = {
  profile: ProfileManagerApi;
};

const GRID_COLUMNS = "grid-cols-[1fr_74px_74px_74px]";
const TIME_INPUT_CLASS =
  "rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none";

const DIGEST_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const COLUMN_HEADER = "text-center text-[11.5px] font-bold uppercase tracking-[0.03em] text-shell-text-faint";

/** My Profile > Notifications, per-category in-app, email and Slack notification preferences. */
const NotificationsSection: React.FC<NotificationsSectionProps> = ({ profile }) => {
  const slack = useSlackIntegration();
  const is_slack_linked = slack.status?.is_connected === true && slack.status.current_user_link !== null;

  return (
    <div>
      <div className="mb-1 text-[24px] font-extrabold tracking-[-0.01em] text-shell-text">Notifications</div>
      <p className="mb-6 text-[13.5px] text-shell-text-muted">Manage your notification preferences</p>

      <SlackConnectionCard slack={slack} />

      {!profile.is_desktop_banner_dismissed ? (
        <div className="mb-6 flex items-center gap-[14px] rounded-xl border border-shell-border bg-shell-hover px-[18px] py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-shell-text">Desktop notifications</div>
            <div className="mt-[1px] text-[12.5px] text-shell-text-muted">
              Receive notifications directly on this computer
            </div>
          </div>
          <button
            type="button"
            onClick={profile.dismissDesktopBanner}
            className="flex-none text-[12.5px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text-secondary"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={profile.toggleDesktopNotifications}
            className="flex-none rounded-lg bg-brand-500 px-4 py-[9px] text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            Enable desktop notifications
          </button>
        </div>
      ) : null}

      <div className="mb-2 text-[13px] font-bold text-shell-text-secondary">System Notifications</div>
      <div className={`mb-[6px] grid ${GRID_COLUMNS} items-center border-b border-shell-border px-1 pb-[10px]`}>
        <span />
        <span className={COLUMN_HEADER}>In app</span>
        <span className={COLUMN_HEADER}>Email</span>
        <span className={COLUMN_HEADER}>Slack</span>
      </div>

      {profile.notification_rows.map((row) => (
        <React.Fragment key={row.key}>
          {row.show_header ? (
            <div
              className="mb-1 ml-1 text-[12px] font-bold uppercase tracking-[0.03em] text-shell-text-faint"
              style={{ marginTop: row.category === "Communication" ? 0 : 14 }}
            >
              {row.category}
            </div>
          ) : null}
          <div className={`grid ${GRID_COLUMNS} items-center border-b border-shell-border px-1 py-3`}>
            <div>
              <div className="text-[13.5px] font-semibold text-shell-text">{row.label}</div>
              <div className="mt-[1px] text-[12px] text-shell-text-faint">{row.sub}</div>
            </div>
            <div className="flex justify-center">
              <ProfileCheckbox
                aria-label={`${row.label}, in app`}
                is_checked={row.app_on}
                onToggle={() => profile.toggleNotificationApp(row.key)}
              />
            </div>
            <div className="flex justify-center">
              <ProfileCheckbox
                aria-label={`${row.label}, email`}
                is_checked={row.email_on}
                onToggle={() => profile.toggleNotificationEmail(row.key)}
              />
            </div>
            <div
              className={`flex justify-center ${is_slack_linked ? "" : "pointer-events-none opacity-40"}`}
              title={is_slack_linked ? undefined : "Connect your Slack account to use this"}
            >
              <ProfileCheckbox
                aria-label={`${row.label}, Slack`}
                is_checked={row.slack_on}
                onToggle={() => profile.toggleNotificationSlack(row.key)}
              />
            </div>
          </div>
        </React.Fragment>
      ))}

      <div className="mt-[22px] rounded-xl border border-shell-border bg-shell-hover px-[18px] py-4">
        <SettingsToggleRow
          label="Desktop notifications"
          description={
            profile.desktop_permission === "denied"
              ? "Blocked by your browser. Allow notifications for this site in your browser settings to turn this on."
              : "Get a desktop notification when something new arrives while this tab is in the background"
          }
          is_on={profile.desktop_notifications_enabled}
          onToggle={profile.toggleDesktopNotifications}
        />
      </div>

      <div className="mt-[14px] rounded-xl border border-shell-border bg-shell-hover px-[18px] py-4">
        <SettingsToggleRow
          label="Quiet hours"
          description="Pause emails, Slack messages, pop-ups and desktop notifications during these hours. Notifications still collect in your bell."
          is_on={profile.quiet_hours_enabled}
          onToggle={profile.toggleQuietHours}
        />
        {profile.quiet_hours_enabled ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-shell-text-muted">
            <label className="flex items-center gap-2">
              From
              <input
                type="time"
                value={profile.quiet_hours_start}
                onChange={(event) => event.target.value && profile.setQuietHoursStart(event.target.value)}
                className={TIME_INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-2">
              To
              <input
                type="time"
                value={profile.quiet_hours_end}
                onChange={(event) => event.target.value && profile.setQuietHoursEnd(event.target.value)}
                className={TIME_INPUT_CLASS}
              />
            </label>
            <span className="text-shell-text-faint">
              {profile.region_timezone
                ? `Times use your time zone (${profile.region_timezone}).`
                : "Times use UTC until you set your time zone in Language & region."}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-[14px] flex items-center gap-4 rounded-xl border border-shell-border bg-shell-hover px-[18px] py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-[3px] text-[13.5px] font-semibold text-shell-text-secondary">Email digest</div>
          <div className="max-w-[420px] text-[12.5px] leading-relaxed text-shell-text-muted">
            A summary of the notifications you have not read yet, sent by email. Nothing is sent when you are all caught up.
          </div>
        </div>
        <select
          value={profile.email_digest_frequency}
          onChange={(event) => profile.setEmailDigestFrequency(event.target.value as EmailDigestFrequency)}
          aria-label="Email digest frequency"
          className={TIME_INPUT_CLASS}
        >
          {DIGEST_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-[14px] overflow-hidden rounded-xl border border-shell-border bg-shell-hover">
        <div
          onClick={profile.toggleMutedBoardsExpanded}
          className="flex cursor-pointer items-center gap-[14px] px-[18px] py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-shell-text">Muted boards</div>
            <div className="mt-[1px] text-[12.5px] text-shell-text-muted">These are boards you muted for yourself</div>
          </div>
          <span
            className="flex-none text-shell-text-muted transition-transform duration-150"
            style={{ transform: profile.is_muted_boards_expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16">
              <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        {profile.is_muted_boards_expanded ? (
          <div className="border-t border-shell-border px-[18px] py-4 text-[13px] text-shell-text-faint">
            You haven&apos;t muted any boards yet.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotificationsSection;
