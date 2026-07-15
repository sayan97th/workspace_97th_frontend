"use client";
import React from "react";
import { SettingsRadioOption } from "@/components/administration";
import ProfileCheckbox from "../ProfileCheckbox";
import type { ProfileManagerApi } from "../useProfileManager";

export type WorkingStatusSectionProps = {
  profile: ProfileManagerApi;
};

/** My Profile > Working status — lets everyone know your current availability. */
const WorkingStatusSection: React.FC<WorkingStatusSectionProps> = ({ profile }) => (
  <div>
    <div className="mb-1 text-[24px] font-extrabold tracking-[-0.01em] text-shell-text">Working status</div>
    <p className="mb-6 text-[13.5px] text-shell-text-muted">Let everyone know your status</p>

    <div className="mb-5 grid grid-cols-3 gap-x-5 gap-y-[14px]">
      {profile.status_options.map((option) => (
        <SettingsRadioOption
          key={option.key}
          label={option.label}
          is_selected={profile.working_status === option.key}
          onSelect={() => profile.setWorkingStatus(option.key)}
        />
      ))}
    </div>

    <input
      type="text"
      value={profile.status_dates}
      onChange={(event) => profile.setStatusDates(event.target.value)}
      placeholder="Choose dates (optional)"
      className="mb-5 w-[260px] rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[11px] text-[13.5px] text-shell-text outline-none focus:border-brand-500"
    />

    <ProfileCheckbox
      className="mb-7"
      label="Disable email and mobile notifications while not in the office"
      is_checked={profile.disable_notifications_while_away}
      onToggle={profile.toggleDisableNotificationsWhileAway}
    />

    <div className="mb-3 text-[14px] font-bold text-shell-text-secondary">User activity indication control</div>
    <ProfileCheckbox
      label="Disable online indication (you also won't see if others are online)"
      is_checked={profile.hide_online_status}
      onToggle={profile.toggleHideOnlineStatus}
    />
  </div>
);

export default WorkingStatusSection;
