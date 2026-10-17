"use client";
import React from "react";
import { Building2, Check } from "lucide-react";
import { ProfileSettingGroup, ProfileSettingRow } from "../ProfileSettingRow";
import { PROFILE_STATUS_ICONS } from "../profileStatusIcons";
import type { ProfileManagerApi } from "../useProfileManager";

export type WorkingStatusSectionProps = {
  profile: ProfileManagerApi;
};

/** My Profile > Working status, lets everyone know your current availability. */
const WorkingStatusSection: React.FC<WorkingStatusSectionProps> = ({ profile }) => (
  <div>
    <ProfileSettingGroup title="Status" description="Pick the one that matches where you are working today." is_framed={false}>
      <div role="radiogroup" aria-label="Working status" className="profile-option-grid">
        {profile.status_options.map((option) => {
          const is_selected = profile.working_status === option.key;
          const Icon = PROFILE_STATUS_ICONS[option.key] ?? Building2;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={is_selected}
              onClick={() => profile.setWorkingStatus(option.key)}
              className="profile-option-tile"
            >
              <span className="profile-option-icon">
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              {option.label}
              {is_selected ? <Check size={16} strokeWidth={2} className="profile-option-check" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </ProfileSettingGroup>

    <ProfileSettingGroup title="Details">
      <ProfileSettingRow
        label="Dates"
        description="Optional, for example Oct 20 to Oct 24."
        control={
          <input
            type="text"
            value={profile.status_dates}
            onChange={(event) => profile.setStatusDates(event.target.value)}
            placeholder="Choose dates (optional)"
            aria-label="Status dates"
            className="profile-input w-[240px]"
          />
        }
      />
      <ProfileSettingRow
        label="Disable email and mobile notifications while not in the office"
        is_on={profile.disable_notifications_while_away}
        onToggle={profile.toggleDisableNotificationsWhileAway}
      />
    </ProfileSettingGroup>

    <ProfileSettingGroup title="User activity indication">
      <ProfileSettingRow
        label="Hide my online indication"
        description="Others will not see when you are online, and you will not see when they are."
        is_on={profile.hide_online_status}
        onToggle={profile.toggleHideOnlineStatus}
      />
    </ProfileSettingGroup>
  </div>
);

export default WorkingStatusSection;
