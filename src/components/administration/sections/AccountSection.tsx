"use client";
import React from "react";
import type { AccountSettingsManagerApi } from "../useAccountSettingsManager";
import SettingsDropdown from "../SettingsDropdown";
import SettingsRadioOption from "../SettingsRadioOption";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "pt", label: "Portuguese" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "zh", label: "Chinese" },
];

const DATE_FORMAT_OPTIONS = [
  { id: "long", label: "July 12, 2026" },
  { id: "euro", label: "12 July, 2026" },
];

const TIME_FORMAT_OPTIONS = [
  { id: "12", label: "12 hours (2:30 PM)" },
  { id: "24", label: "24 hours (14:30)" },
];

const FIRST_DAY_OPTIONS = [
  { id: "sunday", label: "Sunday" },
  { id: "monday", label: "Monday" },
];

/** Every IANA timezone the browser knows, with the account's "use the browser's zone" choice first. */
const timezoneOptions = (): { id: string; label: string }[] => {
  const zones: string[] =
    typeof Intl !== "undefined" && "supportedValuesOf" in Intl
      ? (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone")
      : ["UTC"];
  return [{ id: "", label: "Detect from each person's browser" }, ...zones.map((zone) => ({ id: zone, label: zone.replace(/_/g, " ") }))];
};

const DefaultRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 border-b border-shell-border py-3 last:border-b-0">
    <span className="text-[13.5px] text-shell-text-secondary">{label}</span>
    {children}
  </div>
);

export type AccountSectionProps = {
  account: AccountSettingsManagerApi;
};

const Heading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <>
    <div className="mb-2 text-[15px] font-bold text-shell-text">{title}</div>
    <p className="mb-4 text-[13px] leading-relaxed text-shell-text-muted">{description}</p>
  </>
);

/** Administration > Account: account wide Timeline and home page preferences, plus the defaults new users start with. */
const AccountSection: React.FC<AccountSectionProps> = ({ account }) => {
  const timezone_options = React.useMemo(timezoneOptions, []);

  if (account.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading account settings…</div>;
  }

  return (
    <div className="max-w-[620px]">
      {account.preferences_save_error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {account.preferences_save_error}
        </div>
      ) : null}

      <Heading title="Weekends" description="This sets the first day of the work week across the Timeline." />
      <div className="mb-7 flex flex-col gap-3">
        <SettingsRadioOption
          label="Friday, Saturday"
          is_selected={account.weekend_start === "fri_sat"}
          onSelect={() => account.setWeekendStart("fri_sat")}
        />
        <SettingsRadioOption
          label="Saturday, Sunday"
          is_selected={account.weekend_start === "sat_sun"}
          onSelect={() => account.setWeekendStart("sat_sun")}
        />
      </div>

      <Heading
        title="Show weekends on the Timeline"
        description={'"Hide weekends" greys out weekends in the Timeline Column and only allows selecting work-week dates.'}
      />
      <div className="mb-7 flex flex-col gap-3">
        <SettingsRadioOption
          label="Show weekends"
          is_selected={account.show_weekends}
          onSelect={() => account.setShowWeekends(true)}
        />
        <SettingsRadioOption
          label="Hide weekends"
          is_selected={!account.show_weekends}
          onSelect={() => account.setShowWeekends(false)}
        />
      </div>

      <Heading
        title="Account home page"
        description="Set the home page for everyone in the account, the default home, or any main dashboard."
      />
      <div className="flex flex-col gap-3">
        <SettingsRadioOption
          label="Default"
          is_selected={account.home_page === "default"}
          onSelect={() => account.setHomePage("default")}
        />
        <SettingsRadioOption
          label="Dashboard"
          is_selected={account.home_page === "dashboard"}
          onSelect={() => account.setHomePage("dashboard")}
        />
      </div>

      <div className="mt-9 rounded-xl border border-shell-border bg-shell-panel-alt p-5">
        <div className="mb-1.5 text-[15px] font-bold text-shell-text">Defaults for new users</div>
        <p className="mb-3 text-[13px] leading-relaxed text-shell-text-muted">
          Everyone who joins the account starts with these settings. People can still change them in their own profile,
          and existing users keep what they already chose.
        </p>

        {account.defaults_save_error ? (
          <div className="mb-3 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
            {account.defaults_save_error}
          </div>
        ) : null}
        {account.defaults_saved_notice ? (
          <div className="mb-3 rounded-[9px] border border-shell-border-strong bg-shell-panel px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
            {account.defaults_saved_notice}
          </div>
        ) : null}

        <DefaultRow label="Timezone">
          <SettingsDropdown
            value={account.defaults.default_timezone}
            options={timezone_options}
            onChange={(value) => account.setDefault("default_timezone", value)}
            is_searchable
            className="w-[240px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Language">
          <SettingsDropdown
            value={account.defaults.default_language}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => account.setDefault("default_language", value)}
            className="w-[240px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Date format">
          <SettingsDropdown
            value={account.defaults.default_date_format}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => account.setDefault("default_date_format", value as "long" | "euro")}
            className="w-[240px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Time format">
          <SettingsDropdown
            value={account.defaults.default_time_format}
            options={TIME_FORMAT_OPTIONS}
            onChange={(value) => account.setDefault("default_time_format", value as "12" | "24")}
            className="w-[240px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="First day of the week">
          <SettingsDropdown
            value={account.defaults.default_first_day_of_week}
            options={FIRST_DAY_OPTIONS}
            onChange={(value) => account.setDefault("default_first_day_of_week", value as "sunday" | "monday")}
            className="w-[240px] flex-none"
          />
        </DefaultRow>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void account.saveDefaults()}
            disabled={!account.has_unsaved_defaults || account.is_saving_defaults}
            className="rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {account.is_saving_defaults ? "Saving…" : "Save defaults"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSection;
