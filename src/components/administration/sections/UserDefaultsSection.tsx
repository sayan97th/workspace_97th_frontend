"use client";
import React from "react";
import type { AccountSettingsManagerApi } from "../useAccountSettingsManager";
import SettingsDropdown from "../SettingsDropdown";

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
  <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--admin-list-border)] px-4 py-2 last:border-b-0">
    <span className="text-[14px] text-shell-text">{label}</span>
    {children}
  </div>
);

export type UserDefaultsSectionProps = {
  account: AccountSettingsManagerApi;
};

/**
 * Administration > General > New user defaults: the settings everyone who joins the account starts
 * with. People can still change them in their own profile, and existing users keep what they chose.
 */
const UserDefaultsSection: React.FC<UserDefaultsSectionProps> = ({ account }) => {
  const timezone_options = React.useMemo(timezoneOptions, []);

  if (account.is_loading) {
    return <div className="text-[14px] text-shell-text-faint">Loading account settings…</div>;
  }

  return (
    <div className="max-w-[640px]">
      <p className="mb-4 text-[14px] leading-5 text-shell-text-secondary">
        People can still change these in their own profile, and existing users keep what they already chose.
      </p>

      {account.defaults_save_error ? (
        <div role="alert" className="admin-notice admin-notice-error mb-4">
          {account.defaults_save_error}
        </div>
      ) : null}
      {account.defaults_saved_notice ? (
        <div role="status" className="admin-notice admin-notice-success mb-4">
          {account.defaults_saved_notice}
        </div>
      ) : null}

      <div className="admin-checkbox-list">
        <DefaultRow label="Timezone">
          <SettingsDropdown
            value={account.defaults.default_timezone}
            options={timezone_options}
            onChange={(value) => account.setDefault("default_timezone", value)}
            is_searchable
            className="w-[260px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Language">
          <SettingsDropdown
            value={account.defaults.default_language}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => account.setDefault("default_language", value)}
            className="w-[260px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Date format">
          <SettingsDropdown
            value={account.defaults.default_date_format}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => account.setDefault("default_date_format", value as "long" | "euro")}
            className="w-[260px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="Time format">
          <SettingsDropdown
            value={account.defaults.default_time_format}
            options={TIME_FORMAT_OPTIONS}
            onChange={(value) => account.setDefault("default_time_format", value as "12" | "24")}
            className="w-[260px] flex-none"
          />
        </DefaultRow>
        <DefaultRow label="First day of the week">
          <SettingsDropdown
            value={account.defaults.default_first_day_of_week}
            options={FIRST_DAY_OPTIONS}
            onChange={(value) => account.setDefault("default_first_day_of_week", value as "sunday" | "monday")}
            className="w-[260px] flex-none"
          />
        </DefaultRow>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void account.saveDefaults()}
          disabled={!account.has_unsaved_defaults || account.is_saving_defaults}
          className="h-10 rounded-[4px] bg-brand-500 px-4 text-[14px] font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
        >
          {account.is_saving_defaults ? "Saving…" : "Save defaults"}
        </button>
      </div>
    </div>
  );
};

export default UserDefaultsSection;
