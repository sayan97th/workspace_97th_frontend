"use client";
import React from "react";
import { SettingsToggleRow } from "@/components/administration";
import ProfileCheckbox from "../ProfileCheckbox";
import type { ProfileManagerApi } from "../useProfileManager";

export type NotificationsSectionProps = {
  profile: ProfileManagerApi;
};

/** My Profile > Notifications — per-category in-app / email notification preferences. */
const NotificationsSection: React.FC<NotificationsSectionProps> = ({ profile }) => (
  <div>
    <div className="mb-1 text-[24px] font-extrabold tracking-[-0.01em] text-[#e9eded]">Notifications</div>
    <p className="mb-6 text-[13.5px] text-[#9aa4a5]">Manage your notification preferences</p>

    {!profile.is_desktop_banner_dismissed ? (
      <div className="mb-6 flex items-center gap-[14px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#e9eded]">Desktop notifications</div>
          <div className="mt-[1px] text-[12.5px] text-[#9aa4a5]">
            Receive notifications directly on this computer
          </div>
        </div>
        <button
          type="button"
          onClick={profile.dismissDesktopBanner}
          className="flex-none text-[12.5px] font-semibold text-[#9aa4a5] transition-colors hover:text-[#d7dcdc]"
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

    <div className="mb-2 text-[13px] font-bold text-[#d7dcdc]">System Notifications</div>
    <div className="mb-[6px] grid grid-cols-[1fr_74px_74px] items-center border-b border-white/[0.08] px-1 pb-[10px]">
      <span />
      <span className="text-center text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7e8889]">In app</span>
      <span className="text-center text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7e8889]">Email</span>
    </div>

    {profile.notification_rows.map((row) => (
      <React.Fragment key={row.key}>
        {row.show_header ? (
          <div
            className="mb-1 ml-1 text-[12px] font-bold uppercase tracking-[0.03em] text-[#7e8889]"
            style={{ marginTop: row.category === "Communication" ? 0 : 14 }}
          >
            {row.category}
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_74px_74px] items-center border-b border-white/[0.045] px-1 py-3">
          <div>
            <div className="text-[13.5px] font-semibold text-[#e9eded]">{row.label}</div>
            <div className="mt-[1px] text-[12px] text-[#7e8889]">{row.sub}</div>
          </div>
          <div className="flex justify-center">
            <ProfileCheckbox
              aria-label={`${row.label} — in app`}
              is_checked={row.app_on}
              onToggle={() => profile.toggleNotificationApp(row.key)}
            />
          </div>
          <div className="flex justify-center">
            <ProfileCheckbox
              aria-label={`${row.label} — email`}
              is_checked={row.email_on}
              onToggle={() => profile.toggleNotificationEmail(row.key)}
            />
          </div>
        </div>
      </React.Fragment>
    ))}

    <div className="mt-[22px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4">
      <SettingsToggleRow
        label="Desktop notifications"
        description="Receive notifications directly on this computer"
        is_on={profile.desktop_notifications_enabled}
        onToggle={profile.toggleDesktopNotifications}
      />
    </div>

    <div className="mt-[14px] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
      <div
        onClick={profile.toggleMutedBoardsExpanded}
        className="flex cursor-pointer items-center gap-[14px] px-[18px] py-4"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#e9eded]">Muted boards</div>
          <div className="mt-[1px] text-[12.5px] text-[#9aa4a5]">These are boards you muted for yourself</div>
        </div>
        <span
          className="flex-none text-[#9aa4a5] transition-transform duration-150"
          style={{ transform: profile.is_muted_boards_expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {profile.is_muted_boards_expanded ? (
        <div className="border-t border-white/[0.06] px-[18px] py-4 text-[13px] text-[#7e8889]">
          You haven&apos;t muted any boards yet.
        </div>
      ) : null}
    </div>
  </div>
);

export default NotificationsSection;
