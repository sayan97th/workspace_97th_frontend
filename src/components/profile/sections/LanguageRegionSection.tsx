"use client";
import React from "react";
import { SettingsRadioOption } from "@/components/administration";
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

const REGION_TIMEZONE_OPTIONS = [
  { value: "hi", label: "(GMT-10:00) Hawaii Time" },
  { value: "ak", label: "(GMT-09:00) Alaska Time" },
  { value: "pt", label: "(GMT-08:00) Pacific Time (US & Can)" },
  { value: "mt", label: "(GMT-07:00) Mountain Time (US & Can)" },
  { value: "ct", label: "(GMT-06:00) Central Time (US & Can)" },
  { value: "et", label: "(GMT-05:00) Eastern Time (US & Can)" },
  { value: "ast", label: "(GMT-04:00) Atlantic Time (Can)" },
];

const selectClass =
  "w-full rounded-[9px] border border-white/[0.12] bg-[#142020] px-[13px] py-[11px] text-[14px] text-[#e9eded] outline-none focus:border-brand-500";

const FieldLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`mb-2 text-[13px] font-semibold text-[#d7dcdc] ${className}`}>{children}</div>
);

/** My Profile > Language & region — locale, timezone, and date/time display preferences. */
const LanguageRegionSection: React.FC<LanguageRegionSectionProps> = ({ profile }) => (
  <div className="max-w-[460px]">
    <div className="mb-[26px] text-[24px] font-extrabold tracking-[-0.01em] text-[#e9eded]">Language &amp; region</div>

    <div className="mb-[22px]">
      <FieldLabel>Language</FieldLabel>
      <select
        value={profile.language}
        onChange={(event) => profile.setLanguage(event.target.value)}
        className={selectClass}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <div className="mb-7">
      <FieldLabel>Timezone</FieldLabel>
      <select
        value={profile.region_timezone}
        onChange={(event) => profile.setRegionTimezone(event.target.value)}
        className={selectClass}
      >
        {REGION_TIMEZONE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <div className="mb-[26px]">
      <FieldLabel className="mb-3">Time format</FieldLabel>
      <div className="flex flex-col gap-3">
        <SettingsRadioOption
          label="12 Hours"
          is_selected={profile.time_format === "12"}
          onSelect={() => profile.setTimeFormat("12")}
        />
        <SettingsRadioOption
          label="24 Hours"
          is_selected={profile.time_format === "24"}
          onSelect={() => profile.setTimeFormat("24")}
        />
      </div>
    </div>

    <div className="mb-[26px]">
      <FieldLabel className="mb-3">Date format</FieldLabel>
      <div className="flex flex-col gap-3">
        <SettingsRadioOption
          label="July 12, 2026"
          is_selected={profile.date_format === "long"}
          onSelect={() => profile.setDateFormat("long")}
        />
        <SettingsRadioOption
          label="12 July, 2026"
          is_selected={profile.date_format === "euro"}
          onSelect={() => profile.setDateFormat("euro")}
        />
      </div>
    </div>

    <div>
      <FieldLabel className="mb-3">First day displayed on your calendars</FieldLabel>
      <div className="flex flex-col gap-3">
        <SettingsRadioOption
          label="Sunday"
          is_selected={profile.first_day_of_week === "sunday"}
          onSelect={() => profile.setFirstDayOfWeek("sunday")}
        />
        <SettingsRadioOption
          label="Monday"
          is_selected={profile.first_day_of_week === "monday"}
          onSelect={() => profile.setFirstDayOfWeek("monday")}
        />
      </div>
    </div>
  </div>
);

export default LanguageRegionSection;
