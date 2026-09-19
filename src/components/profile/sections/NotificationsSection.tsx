"use client";
import React, { useEffect, useState } from "react";
import { SettingsToggleRow } from "@/components/administration";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { boardMuteService, type MutedBoardDto } from "@/services/board-mute.service";
import type { EmailDigestFrequency } from "@/types/auth";
import ProfileCheckbox from "../ProfileCheckbox";
import type { ProfileNotificationChannel } from "../types";
import type { ProfileManagerApi } from "../useProfileManager";

export type NotificationsSectionProps = {
  profile: ProfileManagerApi;
};

const GRID_COLUMNS = "grid-cols-[1fr_66px_66px_66px_66px]";
const TIME_INPUT_CLASS =
  "rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none";

const DIGEST_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const COLUMN_HEADER = "text-center text-[11.5px] font-bold uppercase tracking-[0.03em] text-shell-text-faint";

const CHANNEL_COLUMNS: { channel: ProfileNotificationChannel; label: string }[] = [
  { channel: "app", label: "In app" },
  { channel: "email", label: "Email" },
  { channel: "slack", label: "Slack" },
  { channel: "push", label: "Desktop" },
];

/** My Profile > Notifications, per-category in-app, email and Slack notification preferences. */
const NotificationsSection: React.FC<NotificationsSectionProps> = ({ profile }) => {
  const slack = useSlackIntegration();
  const is_slack_linked = slack.status?.is_connected === true && slack.status.current_user_link !== null;
  const [muted_boards, setMutedBoards] = useState<MutedBoardDto[] | null>(null);

  // The list is only fetched once the section is expanded.
  useEffect(() => {
    if (!profile.is_muted_boards_expanded || muted_boards !== null) return;
    boardMuteService
      .listMutedBoards()
      .then(setMutedBoards)
      .catch(() => setMutedBoards([]));
  }, [profile.is_muted_boards_expanded, muted_boards]);

  const unmuteBoard = (board_id: number) => {
    setMutedBoards((current) => (current ?? []).filter((board) => board.board_id !== board_id));
    boardMuteService.unmuteBoard(board_id).catch(() => {});
  };

  const isChannelOn = (row: (typeof profile.notification_rows)[number], channel: ProfileNotificationChannel): boolean =>
    channel === "app" ? row.app_on : channel === "email" ? row.email_on : channel === "slack" ? row.slack_on : row.push_on;

  const toggleChannel = (key: string, channel: ProfileNotificationChannel) => {
    if (channel === "app") profile.toggleNotificationApp(key);
    else if (channel === "email") profile.toggleNotificationEmail(key);
    else if (channel === "slack") profile.toggleNotificationSlack(key);
    else profile.toggleNotificationPush(key);
  };

  const isChannelDisabled = (channel: ProfileNotificationChannel): boolean =>
    (channel === "slack" && !is_slack_linked) || (channel === "push" && !profile.desktop_notifications_enabled);

  const disabledReason = (channel: ProfileNotificationChannel): string | undefined => {
    if (!isChannelDisabled(channel)) return undefined;
    return channel === "slack" ? "Connect your Slack account to use this" : "Turn on desktop notifications to use this";
  };

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

      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-bold text-shell-text-secondary">System Notifications</div>
        <button
          type="button"
          onClick={profile.resetNotificationPreferences}
          className="text-[12px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text-secondary"
        >
          Reset to defaults
        </button>
      </div>
      <div className={`mb-[6px] grid ${GRID_COLUMNS} items-start border-b border-shell-border px-1 pb-[10px]`}>
        <span />
        {CHANNEL_COLUMNS.map(({ channel, label }) => {
          const is_all_on = profile.notification_rows.every((row) => isChannelOn(row, channel));
          return (
            <div key={channel} className="flex flex-col items-center gap-1.5" title={disabledReason(channel)}>
              <span className={COLUMN_HEADER}>{label}</span>
              <div className={isChannelDisabled(channel) ? "pointer-events-none opacity-40" : ""}>
                <ProfileCheckbox
                  aria-label={`${is_all_on ? "Turn off" : "Turn on"} ${label} for every notification`}
                  is_checked={is_all_on}
                  onToggle={() => profile.setNotificationChannelForAll(channel, !is_all_on)}
                />
              </div>
            </div>
          );
        })}
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
            {CHANNEL_COLUMNS.map(({ channel, label }) => (
              <div
                key={channel}
                className={`flex justify-center ${isChannelDisabled(channel) ? "pointer-events-none opacity-40" : ""}`}
                title={disabledReason(channel)}
              >
                <ProfileCheckbox
                  aria-label={`${row.label}, ${label}`}
                  is_checked={isChannelOn(row, channel)}
                  onToggle={() => toggleChannel(row.key, channel)}
                />
              </div>
            ))}
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
          label="Notification sound"
          description="Play a short chime when a new notification arrives while Workspace is open"
          is_on={profile.notification_sound_enabled}
          onToggle={profile.toggleNotificationSound}
        />
        <div className="mt-4 border-t border-shell-border pt-4">
          <SettingsToggleRow
            label="Unread count in the tab title"
            description="Show how many notifications you have not read on the browser tab, for example (3) Workspace"
            is_on={profile.tab_badge_enabled}
            onToggle={profile.toggleTabBadge}
          />
        </div>
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
            {muted_boards === null ? (
              "Loading…"
            ) : muted_boards.length === 0 ? (
              "You haven't muted any boards yet."
            ) : (
              <ul className="flex flex-col gap-1">
                {muted_boards.map((board) => (
                  <li key={board.board_id} className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1.5">
                    <span className="truncate text-[13px] text-shell-text-secondary">{board.board_name}</span>
                    <button
                      type="button"
                      onClick={() => unmuteBoard(board.board_id)}
                      className="flex-none text-[12.5px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]"
                    >
                      Unmute
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotificationsSection;
