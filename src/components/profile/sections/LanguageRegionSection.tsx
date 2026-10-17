"use client";
import React from "react";
import { timezone_options } from "@/data/timezone-options";
import { ProfileSegmented, ProfileSettingGroup, ProfileSettingRow } from "../ProfileSettingRow";
import type { ProfileDateFormat, ProfileFirstDayOfWeek, ProfileTimeFormat } from "../types";
import type { ProfileManagerApi } from "../useProfileManager";

export type LanguageRegionSectionProps = {
  profile: ProfileManagerApi;
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
];

const TIME_FORMAT_OPTIONS: { value: ProfileTimeFormat; label: string }[] = [
  { value: "12", label: "12 hours" },
  { value: "24", label: "24 hours" },
];

const DATE_FORMAT_OPTIONS: { value: ProfileDateFormat; label: string }[] = [
  { value: "long", label: "July 12, 2026" },
  { value: "euro", label: "12 July, 2026" },
];

const FIRST_DAY_OPTIONS: { value: ProfileFirstDayOfWeek; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
];

/** My Profile > Language & region, locale, time zone, and date and time display preferences. */
const LanguageRegionSection: React.FC<LanguageRegionSectionProps> = ({ profile }) => (
  <div>
    <ProfileSettingGroup title="Language and time zone">
      <ProfileSettingRow
        label="Language"
        description="The language used across your workspace."
        control={
          <select
            value={profile.language}
            onChange={(event) => profile.setLanguage(event.target.value)}
            aria-label="Language"
            className="profile-input w-[240px]"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />
      <ProfileSettingRow
        label="Time zone"
        description="Used for quiet hours and the local time shown on your profile."
        control={
          <select
            value={profile.region_timezone}
            onChange={(event) => profile.setRegionTimezone(event.target.value)}
            aria-label="Time zone"
            className="profile-input w-[280px] max-w-full"
          >
            {profile.region_timezone ? null : <option value="">Select your time zone</option>}
            {timezone_options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />
    </ProfileSettingGroup>

    <ProfileSettingGroup title="Date and time format">
      <ProfileSettingRow
        label="Time format"
        control={
          <ProfileSegmented
            aria-label="Time format"
            value={profile.time_format}
            options={TIME_FORMAT_OPTIONS}
            onChange={profile.setTimeFormat}
          />
        }
      />
      <ProfileSettingRow
        label="Date format"
        control={
          <ProfileSegmented
            aria-label="Date format"
            value={profile.date_format}
            options={DATE_FORMAT_OPTIONS}
            onChange={profile.setDateFormat}
          />
        }
      />
      <ProfileSettingRow
        label="First day of the week"
        description="The first day shown on your calendars."
        control={
          <ProfileSegmented
            aria-label="First day of the week"
            value={profile.first_day_of_week}
            options={FIRST_DAY_OPTIONS}
            onChange={profile.setFirstDayOfWeek}
          />
        }
      />
    </ProfileSettingGroup>
  </div>
);

export default LanguageRegionSection;
