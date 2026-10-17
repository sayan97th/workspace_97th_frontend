"use client";
import React, { useEffect, useState } from "react";
import { BellRing, ChevronDown } from "lucide-react";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { boardMuteService, type MutedBoardDto } from "@/services/board-mute.service";
import type { EmailDigestFrequency } from "@/types/auth";
import ProfileCheckbox from "../ProfileCheckbox";
import { ProfileSettingGroup, ProfileSettingRow } from "../ProfileSettingRow";
import ProfileTooltip from "../ProfileTooltip";
import type { ProfileNotificationChannel } from "../types";
import type { ProfileManagerApi } from "../useProfileManager";

export type NotificationsSectionProps = {
  profile: ProfileManagerApi;
};

const GRID_COLUMNS = "grid-cols-[minmax(220px,1fr)_76px_76px_76px_76px]";

const DIGEST_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const CHANNEL_COLUMNS: { channel: ProfileNotificationChannel; label: string; description: string }[] = [
  { channel: "app", label: "In app", description: "Shown in your bell and Update Feed" },
  { channel: "email", label: "Email", description: "Sent to your email address" },
  { channel: "slack", label: "Slack", description: "Sent as a Slack direct message" },
  { channel: "push", label: "Desktop", description: "Shown as a desktop notification on this computer" },
];

/** My Profile > Notifications, per category in app, email, Slack and desktop preferences plus delivery settings. */
const NotificationsSection: React.FC<NotificationsSectionProps> = ({ profile }) => {
  const slack = useSlackIntegration();
  const is_slack_linked = (slack.status?.current_user_link ?? null) !== null;
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

  const disabledReason = (channel: ProfileNotificationChannel): string | null => {
    if (!isChannelDisabled(channel)) return null;
    return channel === "slack" ? "Connect your Slack account to use this" : "Turn on desktop notifications to use this";
  };

  return (
    <div>
      <SlackConnectionCard slack={slack} />

      {!profile.is_desktop_banner_dismissed ? (
        <div className="profile-promo mb-7">
          <span className="profile-device-icon">
            <BellRing size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="profile-row-label">Desktop notifications</div>
            <div className="profile-row-description">Receive notifications directly on this computer.</div>
          </div>
          <button type="button" onClick={profile.dismissDesktopBanner} className="profile-button profile-button-tertiary">
            Dismiss
          </button>
          <button type="button" onClick={profile.toggleDesktopNotifications} className="profile-button profile-button-primary">
            Enable desktop notifications
          </button>
        </div>
      ) : null}

      <ProfileSettingGroup
        title="What you are notified about"
        description="The header checkboxes turn a channel on or off for every notification."
        is_framed={false}
        action={
          <button type="button" onClick={profile.resetNotificationPreferences} className="profile-link flex-none">
            Reset to defaults
          </button>
        }
      >
        <div className="profile-table">
          <div className="profile-table-scroll">
            <div className={`profile-table-grid profile-table-head ${GRID_COLUMNS} py-2`}>
              <span>Notification</span>
              {CHANNEL_COLUMNS.map(({ channel, label, description }) => {
                const is_all_on = profile.notification_rows.every((row) => isChannelOn(row, channel));
                const is_disabled = isChannelDisabled(channel);
                return (
                  <div key={channel} className="flex flex-col items-center gap-1.5">
                    <ProfileTooltip content={disabledReason(channel) ?? description}>
                      <span className="cursor-default">{label}</span>
                    </ProfileTooltip>
                    <ProfileCheckbox
                      aria-label={`${is_all_on ? "Turn off" : "Turn on"} ${label} for every notification`}
                      is_checked={is_all_on}
                      is_disabled={is_disabled}
                      onToggle={() => profile.setNotificationChannelForAll(channel, !is_all_on)}
                    />
                  </div>
                );
              })}
            </div>

            {profile.notification_rows.map((row) => (
              <React.Fragment key={row.key}>
                {row.show_header ? <div className="profile-table-category min-w-[640px]">{row.category}</div> : null}
                <div className={`profile-table-grid profile-table-row ${GRID_COLUMNS} py-2.5`}>
                  <div className="min-w-0">
                    <div className="profile-row-label">{row.label}</div>
                    <div className="profile-row-description">{row.sub}</div>
                  </div>
                  {CHANNEL_COLUMNS.map(({ channel, label }) => {
                    const reason = disabledReason(channel);
                    return (
                      <div key={channel} className="profile-table-cell-center">
                        <ProfileTooltip content={reason} disabled={!reason}>
                          <ProfileCheckbox
                            aria-label={`${row.label}, ${row.sub}, ${label}`}
                            is_checked={isChannelOn(row, channel)}
                            is_disabled={reason !== null}
                            onToggle={() => toggleChannel(row.key, channel)}
                          />
                        </ProfileTooltip>
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </ProfileSettingGroup>

      <ProfileSettingGroup title="Delivery">
        <ProfileSettingRow
          label="Desktop notifications"
          description={
            profile.desktop_permission === "denied"
              ? "Blocked by your browser. Allow notifications for this site in your browser settings to turn this on."
              : "Get a desktop notification when something new arrives while this tab is in the background."
          }
          is_on={profile.desktop_notifications_enabled}
          onToggle={profile.toggleDesktopNotifications}
        />
        <ProfileSettingRow
          label="Notification sound"
          description="Play a short chime when a new notification arrives while Workspace is open."
          is_on={profile.notification_sound_enabled}
          onToggle={profile.toggleNotificationSound}
        />
        <ProfileSettingRow
          label="Unread count in the tab title"
          description="Show how many notifications you have not read on the browser tab, for example (3) Workspace."
          is_on={profile.tab_badge_enabled}
          onToggle={profile.toggleTabBadge}
        />
        <ProfileSettingRow
          label="Email digest"
          description="A summary of the notifications you have not read yet, sent by email. Nothing is sent when you are all caught up."
          control={
            <select
              value={profile.email_digest_frequency}
              onChange={(event) => profile.setEmailDigestFrequency(event.target.value as EmailDigestFrequency)}
              aria-label="Email digest frequency"
              className="profile-input profile-input-compact"
            >
              {DIGEST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          }
        />
      </ProfileSettingGroup>

      <ProfileSettingGroup title="Focus">
        <ProfileSettingRow
          label="Quiet hours"
          description="Pause emails, Slack messages, pop-ups and desktop notifications during these hours. Notifications still collect in your bell."
          is_on={profile.quiet_hours_enabled}
          onToggle={profile.toggleQuietHours}
        >
          {profile.quiet_hours_enabled ? (
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--profile-text-secondary)]">
              <label className="flex items-center gap-2">
                From
                <input
                  type="time"
                  value={profile.quiet_hours_start}
                  onChange={(event) => event.target.value && profile.setQuietHoursStart(event.target.value)}
                  className="profile-input profile-input-compact"
                />
              </label>
              <label className="flex items-center gap-2">
                To
                <input
                  type="time"
                  value={profile.quiet_hours_end}
                  onChange={(event) => event.target.value && profile.setQuietHoursEnd(event.target.value)}
                  className="profile-input profile-input-compact"
                />
              </label>
              <span className="text-[var(--profile-text-faint)]">
                {profile.region_timezone
                  ? `Times use your time zone (${profile.region_timezone}).`
                  : "Times use UTC until you set your time zone in Language & region."}
              </span>
            </div>
          ) : null}
        </ProfileSettingRow>
        <ProfileSettingRow
          label="Follow items I comment on"
          description="Add an item to the Following tab of your Update Feed when you comment on it or someone mentions you in it. You can unfollow from the feed at any time."
          is_on={profile.auto_follow_enabled}
          onToggle={profile.toggleAutoFollow}
        />
        <ProfileSettingRow
          label="Muted boards"
          description="Boards you muted for yourself. You get no notifications from them."
          control={
            <ProfileTooltip content={profile.is_muted_boards_expanded ? "Hide muted boards" : "Show muted boards"}>
              <button
                type="button"
                onClick={profile.toggleMutedBoardsExpanded}
                aria-expanded={profile.is_muted_boards_expanded}
                aria-controls="profile-muted-boards"
                className="profile-button profile-button-secondary"
              >
                {profile.is_muted_boards_expanded ? "Hide" : "Show"}
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={`transition-transform duration-150 ${profile.is_muted_boards_expanded ? "rotate-180" : ""}`}
                />
              </button>
            </ProfileTooltip>
          }
        >
          {profile.is_muted_boards_expanded ? (
            <div id="profile-muted-boards" className="profile-row-description max-w-none">
              {muted_boards === null ? (
                "Loading…"
              ) : muted_boards.length === 0 ? (
                "You haven't muted any boards yet."
              ) : (
                <ul className="profile-group-frame">
                  {muted_boards.map((board) => (
                    <li key={board.board_id} className="profile-row min-h-[44px] py-2">
                      <span className="profile-row-text truncate text-[14px] text-[var(--profile-text)]">{board.board_name}</span>
                      <button type="button" onClick={() => unmuteBoard(board.board_id)} className="profile-link">
                        Unmute
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </ProfileSettingRow>
      </ProfileSettingGroup>
    </div>
  );
};

export default NotificationsSection;
